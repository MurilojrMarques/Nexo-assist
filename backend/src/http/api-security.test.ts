import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createLogger } from "../infra/logging/logger.js";
import { JoseAccessTokenService } from "../infra/security/jose-access-token-service.js";
import { AuthService } from "../modules/auth/auth.service.js";
import type { TicketGateway, TicketView } from "../modules/tickets/ticket.types.js";
import { ConversationService } from "../modules/conversations/conversation.service.js";
import { NotFoundError } from "../shared/errors/http-errors.js";
import { FakeServiceDeskAgent } from "../testing/fake-service-desk-agent.js";
import { InMemoryConversationStore } from "../testing/in-memory-conversation-store.js";
import { FakeClock, FakeHasher, InMemorySessions, InMemoryUsers, RecordingAudit } from "../testing/in-memory-auth.js";

const tokenSettings = { secret: "s".repeat(48), issuer: "nexo-assist-api", audience: "nexo-assist-web", ttlSeconds: 900 };

function ticket(code: string): TicketView {
  return {
    code,
    type: "INCIDENT",
    category: "HARDWARE",
    priority: "MEDIUM",
    status: "OPEN",
    affectedScope: "ONLY_ME",
    title: `Chamado ${code}`,
    description: "Descrição",
    dueAt: null,
    lastActivityAt: "2026-11-18T12:00:00.000Z",
    resolvedAt: null,
    createdAt: "2026-11-18T12:00:00.000Z",
    overdue: false,
    reopenable: false,
  };
}

function fakeGateway(ticketsByRequester: Map<string, TicketView[]>): TicketGateway {
  const unsupported = async (): Promise<never> => {
    throw new Error("não usado neste teste");
  };

  return {
    listByRequester: async (id) => ticketsByRequester.get(id) ?? [],
    getForRequester: async (code, id) => {
      const found = (ticketsByRequester.get(id) ?? []).find((item) => item.code === code);
      if (!found) {
        throw new NotFoundError("Chamado não encontrado.");
      }
      return found;
    },
    findRelated: unsupported,
    create: unsupported,
    addComment: unsupported,
    reopen: unsupported,
    transfer: unsupported,
  };
}

function setup(loginPer15Minutes = 50) {
  const users = new InMemoryUsers();
  const sessions = new InMemorySessions(users);
  const clock = new FakeClock(new Date());
  const tokens = new JoseAccessTokenService(tokenSettings);
  const ana = users.add({ email: "ana.souza@nexo.com.br", passwordHash: "hashed:Senha-123" });
  const bruno = users.add({ email: "bruno.tavares@nexo.com.br", passwordHash: "hashed:Senha-123" });
  const rafael = users.add({
    email: "rafael.lima@nexo.com.br",
    passwordHash: "hashed:Senha-123",
    role: "ANALYST",
    team: "Suporte N2",
  });
  const ticketsByRequester = new Map([
    [ana.id, [ticket("INC-20311")]],
    [bruno.id, [ticket("INC-20320")]],
  ]);
  const tickets = fakeGateway(ticketsByRequester);
  const authService = new AuthService({
    users,
    sessions,
    tokens,
    clock,
    hasher: new FakeHasher(),
    audit: new RecordingAudit(),
    settings: { refreshTokenTtlDays: 7, sessionMaxAgeDays: 30, maxFailedAttempts: 5, lockoutMinutes: 15, refreshReuseGraceSeconds: 10 },
  });
  const logger = createLogger("silent");
  const people = new Map([...users.records.values()].map((user) => [user.id, { name: user.name, department: user.department }]));
  const conversations = new ConversationService({
    store: new InMemoryConversationStore(people),
    agent: new FakeServiceDeskAgent(),
    tickets,
    clock,
    logger,
    historyWindow: 12,
  });
  const app = createApp(
    { authService, users, sessions, tokens, tickets, conversations, messagesPerMinute: 100, clock, logger, cookies: { secure: false } },
    {
      corsOrigins: ["http://localhost:3000"],
      trustProxy: false,
      rateLimits: { apiPerMinute: 1000, loginPer15Minutes, refreshPerMinute: 1000 },
    },
  );

  return { app, ana, bruno, rafael, clock };
}

async function login(app: ReturnType<typeof setup>["app"], email: string) {
  const response = await request(app).post("/api/auth/login").send({ email, password: "Senha-123" });
  return { token: response.body.accessToken as string, cookie: response.headers["set-cookie"] as unknown as string[] };
}

describe("API: autenticação obrigatória", () => {
  it("o health check é público e já sai com cabeçalhos de segurança", async () => {
    const { app } = setup();
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it.each([
    ["sem cabeçalho", undefined],
    ["esquema errado", "Basic YW5hOnNlbmhh"],
    ["token malformado", "Bearer abc"],
    ["token de outro emissor", "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl"],
  ])("recusa requisição %s com 401", async (_case, authorization) => {
    const { app } = setup();
    const call = request(app).get("/api/employee/tickets");
    const response = await (authorization ? call.set("Authorization", authorization) : call);

    expect(response.status).toBe(401);
    expect(response.headers["www-authenticate"]).toContain("Bearer");
  });

  it("não revela quais rotas existem para quem não está autenticado", async () => {
    const { app } = setup();
    const response = await request(app).get("/api/rota-que-nao-existe");

    expect(response.status).toBe(401);
  });
});

describe("API: login e sessão", () => {
  it("devolve o access token no corpo e o refresh token só em cookie httpOnly", async () => {
    const { app } = setup();
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "  Ana.Souza@NEXO.com.br ", password: "Senha-123" });
    const cookie = (response.headers["set-cookie"] as unknown as string[])[0];

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ tokenType: "Bearer", expiresIn: 900 });
    expect(response.body.refreshToken).toBeUndefined();
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(cookie).toMatch(/^nexo_rt=[A-Za-z0-9_-]{43};/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/api/auth");
  });

  it("responde com mensagem genérica para credenciais erradas", async () => {
    const { app } = setup();
    const response = await request(app).post("/api/auth/login").send({ email: "ana.souza@nexo.com.br", password: "x" });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("E-mail ou senha inválidos.");
  });

  it("recusa campos inesperados no corpo do login", async () => {
    const { app } = setup();
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana.souza@nexo.com.br", password: "Senha-123", role: "ANALYST" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("limita tentativas de login por IP e e-mail", async () => {
    const { app } = setup(2);
    const attempt = () => request(app).post("/api/auth/login").send({ email: "ana.souza@nexo.com.br", password: "x" });

    await attempt();
    await attempt();
    const blocked = await attempt();

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("TOO_MANY_REQUESTS");
  });

  it("renova pelo cookie e troca o refresh token", async () => {
    const { app } = setup();
    const { cookie } = await login(app, "ana.souza@nexo.com.br");

    const refreshed = await request(app).post("/api/auth/refresh").set("Cookie", cookie);

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeTypeOf("string");
    expect(refreshed.headers["set-cookie"]?.[0]).not.toBe(cookie[0]);
  });

  it("em refresh simultâneo de duas abas, recusa o atrasado sem apagar o cookie", async () => {
    const { app } = setup();
    const { cookie } = await login(app, "ana.souza@nexo.com.br");

    await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    const late = await request(app).post("/api/auth/refresh").set("Cookie", cookie);

    expect(late.status).toBe(401);
    expect(late.body.error.code).toBe("REFRESH_TOKEN_RACE");
    expect(late.headers["set-cookie"]).toBeUndefined();
  });

  it("recusa o cookie antigo reapresentado depois da tolerância e apaga o cookie", async () => {
    const { app, clock } = setup();
    const { cookie } = await login(app, "ana.souza@nexo.com.br");

    await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    clock.advance(11_000);
    const reused = await request(app).post("/api/auth/refresh").set("Cookie", cookie);

    expect(reused.status).toBe(401);
    expect(reused.body.error.code).toBe("UNAUTHORIZED");
    expect(reused.headers["set-cookie"]?.[0]).toMatch(/^nexo_rt=;/);
  });

  it("logout derruba o access token na hora", async () => {
    const { app } = setup();
    const { token } = await login(app, "ana.souza@nexo.com.br");

    const logout = await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`);
    const after = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(logout.status).toBe(204);
    expect(after.status).toBe(401);
  });

  it("recusa corpo acima de 100 KB", async () => {
    const { app } = setup();
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana.souza@nexo.com.br", password: "x".repeat(150_000) });

    expect(response.status).toBe(413);
  });

  it("não libera CORS para origem desconhecida", async () => {
    const { app } = setup();
    const allowed = await request(app).get("/api/health").set("Origin", "http://localhost:3000");
    const denied = await request(app).get("/api/health").set("Origin", "https://site-malicioso.com");

    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("API: separação de acesso", () => {
  it("funcionário vê só os próprios chamados", async () => {
    const { app } = setup();
    const { token } = await login(app, "ana.souza@nexo.com.br");
    const response = await request(app).get("/api/employee/tickets").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.tickets.map((item: TicketView) => item.code)).toEqual(["INC-20311"]);
  });

  it("funcionário abre o próprio chamado, mas o de outra pessoa responde como inexistente", async () => {
    const { app } = setup();
    const { token } = await login(app, "ana.souza@nexo.com.br");

    const own = await request(app).get("/api/employee/tickets/INC-20311").set("Authorization", `Bearer ${token}`);
    const other = await request(app).get("/api/employee/tickets/INC-20320").set("Authorization", `Bearer ${token}`);
    const invalid = await request(app).get("/api/employee/tickets/DROP%20TABLE").set("Authorization", `Bearer ${token}`);

    expect(own.status).toBe(200);
    expect(own.body.ticket.code).toBe("INC-20311");
    expect(other.status).toBe(404);
    expect(invalid.status).toBe(400);
  });

  it("funcionário não acessa a área do suporte, nem para ver chamados de outra pessoa", async () => {
    const { app, bruno } = setup();
    const { token } = await login(app, "ana.souza@nexo.com.br");
    const response = await request(app)
      .get(`/api/support/employees/${bruno.id}/tickets`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it("analista consulta os chamados de um funcionário, mas não usa a área do funcionário", async () => {
    const { app, bruno } = setup();
    const { token } = await login(app, "rafael.lima@nexo.com.br");

    const support = await request(app)
      .get(`/api/support/employees/${bruno.id}/tickets`)
      .set("Authorization", `Bearer ${token}`);
    const employeeArea = await request(app).get("/api/employee/tickets").set("Authorization", `Bearer ${token}`);

    expect(support.status).toBe(200);
    expect(support.body.tickets.map((item: TicketView) => item.code)).toEqual(["INC-20320"]);
    expect(employeeArea.status).toBe(403);
  });

  it("valida o identificador recebido na URL", async () => {
    const { app } = setup();
    const { token } = await login(app, "rafael.lima@nexo.com.br");
    const response = await request(app)
      .get("/api/support/employees/1%20OR%201=1/tickets")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
  });
});

describe("API: conversas", () => {
  async function startConversation(app: ReturnType<typeof setup>["app"], token: string): Promise<string> {
    const response = await request(app).post("/api/employee/conversations").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(201);
    return response.body.conversation.id as string;
  }

  it("responde a mensagem do funcionário em streaming (SSE)", async () => {
    const { app } = setup();
    const { token } = await login(app, "ana.souza@nexo.com.br");
    const conversationId = await startConversation(app, token);

    const response = await request(app)
      .post(`/api/employee/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Meu notebook está lento" });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.text.match(/^event: (\w+)$/gm)).toEqual([
      "event: message",
      "event: text",
      "event: message",
      "event: conversation",
      "event: done",
    ]);
  });

  it("erros antes do streaming saem como JSON comum", async () => {
    const { app } = setup();
    const { token } = await login(app, "ana.souza@nexo.com.br");
    const conversationId = await startConversation(app, token);

    const empty = await request(app)
      .post(`/api/employee/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "   " });

    expect(empty.status).toBe(400);
    expect(empty.headers["content-type"]).toContain("application/json");
  });

  it("conversa de outra pessoa responde como inexistente", async () => {
    const { app } = setup();
    const ana = await login(app, "ana.souza@nexo.com.br");
    const bruno = await login(app, "bruno.tavares@nexo.com.br");
    const conversationId = await startConversation(app, ana.token);

    const read = await request(app).get(`/api/employee/conversations/${conversationId}`).set("Authorization", `Bearer ${bruno.token}`);
    const write = await request(app)
      .post(`/api/employee/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${bruno.token}`)
      .send({ content: "oi" });

    expect(read.status).toBe(404);
    expect(write.status).toBe(404);
  });

  it("funcionário não usa o console e analista não fala como funcionário", async () => {
    const { app } = setup();
    const ana = await login(app, "ana.souza@nexo.com.br");
    const rafael = await login(app, "rafael.lima@nexo.com.br");
    const conversationId = await startConversation(app, ana.token);

    const queue = await request(app).get("/api/support/conversations").set("Authorization", `Bearer ${ana.token}`);
    const assume = await request(app)
      .post(`/api/support/conversations/${conversationId}/assume`)
      .set("Authorization", `Bearer ${ana.token}`);
    const impersonate = await request(app)
      .post(`/api/employee/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${rafael.token}`)
      .send({ content: "oi" });
    const analystQueue = await request(app).get("/api/support/conversations").set("Authorization", `Bearer ${rafael.token}`);

    expect(queue.status).toBe(403);
    expect(assume.status).toBe(403);
    expect(impersonate.status).toBe(403);
    expect(analystQueue.status).toBe(200);
    expect(analystQueue.body.conversations).toHaveLength(1);
  });

  it("valida os identificadores de conversa e rascunho", async () => {
    const { app } = setup();
    const { token } = await login(app, "ana.souza@nexo.com.br");

    const response = await request(app)
      .post("/api/employee/conversations/1%20OR%201=1/drafts/abc/confirm")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
  });
});
