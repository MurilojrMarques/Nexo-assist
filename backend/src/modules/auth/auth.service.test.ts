import { beforeEach, describe, expect, it } from "vitest";
import { JoseAccessTokenService } from "../../infra/security/jose-access-token-service.js";
import { hashOpaqueToken } from "../../infra/security/opaque-token.js";
import { FakeClock, FakeHasher, InMemorySessions, InMemoryUsers, RecordingAudit } from "../../testing/in-memory-auth.js";
import { AuthService } from "./auth.service.js";

const MINUTE = 60_000;
const DAY = 86_400_000;
const client = { ipAddress: "10.0.0.1", userAgent: "vitest" };

function setup() {
  const users = new InMemoryUsers();
  const sessions = new InMemorySessions(users);
  const hasher = new FakeHasher();
  const audit = new RecordingAudit();
  const clock = new FakeClock();
  const tokens = new JoseAccessTokenService({
    secret: "s".repeat(48),
    issuer: "nexo-assist-api",
    audience: "nexo-assist-web",
    ttlSeconds: 900,
  });
  const service = new AuthService({
    users,
    sessions,
    hasher,
    tokens,
    audit,
    clock,
    settings: { refreshTokenTtlDays: 7, sessionMaxAgeDays: 30, maxFailedAttempts: 5, lockoutMinutes: 15, refreshReuseGraceSeconds: 10 },
  });
  const ana = users.add({ email: "ana.souza@nexo.com.br", name: "Ana Souza", passwordHash: "hashed:Senha-123" });

  return { users, sessions, hasher, audit, clock, tokens, service, ana };
}

describe("AuthService.login", () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  it("abre uma sessão e devolve access token, refresh token e o usuário sem dados sensíveis", async () => {
    const result = await ctx.service.login("ana.souza@nexo.com.br", "Senha-123", client);

    expect(result.user).toEqual({
      id: ctx.ana.id,
      email: "ana.souza@nexo.com.br",
      name: "Ana Souza",
      department: "TI",
      role: "EMPLOYEE",
      team: null,
    });
    expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await ctx.tokens.verify(result.accessToken)).toMatchObject({ userId: ctx.ana.id, role: "EMPLOYEE" });
    expect([...ctx.sessions.tokens.values()][0]?.tokenHash).toBe(hashOpaqueToken(result.refreshToken));
    expect(ctx.audit.actions()).toEqual(["LOGIN_SUCCEEDED"]);
  });

  it("responde igual para e-mail inexistente e senha errada, e ainda gasta a verificação de senha", async () => {
    const unknown = ctx.service.login("ninguem@nexo.com.br", "Senha-123", client);
    await expect(unknown).rejects.toThrow("E-mail ou senha inválidos.");
    expect(ctx.hasher.verifyCalls).toBe(1);

    await expect(ctx.service.login("ana.souza@nexo.com.br", "errada", client)).rejects.toThrow("E-mail ou senha inválidos.");
    expect(ctx.audit.entries.map((entry) => entry.metadata?.reason)).toEqual(["UNKNOWN_EMAIL", "WRONG_PASSWORD"]);
  });

  it("bloqueia a conta após 5 senhas erradas, mesmo com a senha certa, e libera depois do prazo", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(ctx.service.login(ctx.ana.email, "errada", client)).rejects.toThrow();
    }

    expect(ctx.audit.actions().at(-1)).toBe("ACCOUNT_LOCKED");
    await expect(ctx.service.login(ctx.ana.email, "Senha-123", client)).rejects.toThrow("E-mail ou senha inválidos.");

    ctx.clock.advance(15 * MINUTE + 1);

    await expect(ctx.service.login(ctx.ana.email, "Senha-123", client)).resolves.toBeDefined();
  });

  it("zera as tentativas erradas depois de um login bem-sucedido", async () => {
    await expect(ctx.service.login(ctx.ana.email, "errada", client)).rejects.toThrow();
    await ctx.service.login(ctx.ana.email, "Senha-123", client);

    expect(ctx.users.records.get(ctx.ana.id)?.failedLoginAttempts).toBe(0);
  });

  it("recusa usuário desativado", async () => {
    ctx.users.records.get(ctx.ana.id)!.isActive = false;

    await expect(ctx.service.login(ctx.ana.email, "Senha-123", client)).rejects.toThrow("E-mail ou senha inválidos.");
  });

  it("atualiza o hash quando os parâmetros de segurança mudaram", async () => {
    ctx.users.records.get(ctx.ana.id)!.passwordHash = "legacy:Senha-123";

    await ctx.service.login(ctx.ana.email, "Senha-123", client);

    expect(ctx.users.records.get(ctx.ana.id)?.passwordHash).toBe("hashed:Senha-123");
  });
});

describe("AuthService.refresh", () => {
  it("troca o refresh token a cada uso e invalida o anterior", async () => {
    const ctx = setup();
    const login = await ctx.service.login(ctx.ana.email, "Senha-123", client);

    const refreshed = await ctx.service.refresh(login.refreshToken, client);

    expect(refreshed.refreshToken).not.toBe(login.refreshToken);
    expect(await ctx.tokens.verify(refreshed.accessToken)).toMatchObject({ userId: ctx.ana.id });
    await expect(ctx.service.refresh(refreshed.refreshToken, client)).resolves.toBeDefined();
  });

  it("trata reuso logo após a troca como corrida entre abas, sem derrubar a sessão", async () => {
    const ctx = setup();
    const login = await ctx.service.login(ctx.ana.email, "Senha-123", client);
    const refreshed = await ctx.service.refresh(login.refreshToken, client);

    ctx.clock.advance(5_000);

    await expect(ctx.service.refresh(login.refreshToken, client)).rejects.toMatchObject({ code: "REFRESH_TOKEN_RACE" });
    await expect(ctx.service.refresh(refreshed.refreshToken, client)).resolves.toBeDefined();
    expect(ctx.audit.actions()).not.toContain("REFRESH_TOKEN_REUSED");
  });

  it("detecta reuso de refresh token fora da tolerância e derruba a sessão inteira", async () => {
    const ctx = setup();
    const login = await ctx.service.login(ctx.ana.email, "Senha-123", client);
    const refreshed = await ctx.service.refresh(login.refreshToken, client);

    ctx.clock.advance(11_000);

    await expect(ctx.service.refresh(login.refreshToken, client)).rejects.toThrow("Sessão expirada. Entre novamente.");
    await expect(ctx.service.refresh(refreshed.refreshToken, client)).rejects.toThrow();
    expect(ctx.audit.actions()).toContain("REFRESH_TOKEN_REUSED");
    expect([...ctx.sessions.sessions.values()][0]?.revokedReason).toBe("REFRESH_TOKEN_REUSE");
  });

  it("recusa refresh token desconhecido ou vencido", async () => {
    const ctx = setup();
    const login = await ctx.service.login(ctx.ana.email, "Senha-123", client);

    await expect(ctx.service.refresh("x".repeat(43), client)).rejects.toThrow();

    ctx.clock.advance(7 * DAY + 1);
    await expect(ctx.service.refresh(login.refreshToken, client)).rejects.toThrow();
  });

  it("não estende a sessão além da idade máxima", async () => {
    const ctx = setup();
    let { refreshToken } = await ctx.service.login(ctx.ana.email, "Senha-123", client);

    for (let day = 0; day < 4; day += 1) {
      ctx.clock.advance(6 * DAY);
      ({ refreshToken } = await ctx.service.refresh(refreshToken, client));
    }

    ctx.clock.advance(6 * DAY + 1);
    await expect(ctx.service.refresh(refreshToken, client)).rejects.toThrow();
  });
});

describe("AuthService.logout", () => {
  it("revoga a sessão, invalidando o access token e o refresh token", async () => {
    const ctx = setup();
    const login = await ctx.service.login(ctx.ana.email, "Senha-123", client);
    const { sessionId } = await ctx.tokens.verify(login.accessToken);

    await ctx.service.logout({ userId: ctx.ana.id, role: "EMPLOYEE", sessionId }, client);

    expect(await ctx.sessions.findActiveSessionUser(sessionId, ctx.clock.now())).toBeNull();
    await expect(ctx.service.refresh(login.refreshToken, client)).rejects.toThrow();
    expect(ctx.audit.actions()).toContain("LOGOUT");
  });
});
