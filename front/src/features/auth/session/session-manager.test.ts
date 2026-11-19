import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/api-error";
import type { RequestFn } from "@/lib/api/http";
import type { AuthApi } from "@/features/auth/api/auth-api";
import type { AuthSession } from "@/features/auth/types";
import { SessionManager } from "./session-manager";

const ana = {
  id: "u1",
  email: "ana.souza@nexo.com.br",
  name: "Ana Souza",
  department: "Financeiro",
  role: "EMPLOYEE" as const,
  team: null,
};

function session(accessToken: string): AuthSession {
  return { accessToken, expiresIn: 900, user: ana };
}

const expired = () => new ApiError(401, "UNAUTHORIZED", "Sessão expirada. Entre novamente.");
const race = () => new ApiError(401, "REFRESH_TOKEN_RACE", "Corrida");

function setup(overrides: Partial<AuthApi> = {}) {
  const auth: AuthApi = {
    login: vi.fn(async () => session("token-login")),
    refresh: vi.fn(async () => session("token-refresh")),
    logout: vi.fn(async () => undefined),
    ...overrides,
  };
  const request = vi.fn(async () => ({ ok: true })) as unknown as RequestFn & ReturnType<typeof vi.fn>;
  const manager = new SessionManager({ auth, request, wait: async () => undefined });

  return { auth, request, manager };
}

describe("SessionManager", () => {
  it("começa carregando e restaura a sessão pelo cookie de refresh", async () => {
    const { manager } = setup();

    expect(manager.getSnapshot().status).toBe("loading");
    await manager.restore();

    expect(manager.getSnapshot()).toEqual({ status: "authenticated", user: ana });
  });

  it("fica deslogado quando não há sessão para restaurar", async () => {
    const { manager } = setup({ refresh: vi.fn(async () => Promise.reject(expired())) });

    await manager.restore();

    expect(manager.getSnapshot()).toEqual({ status: "unauthenticated", user: null });
  });

  it("faz um único refresh mesmo com várias chamadas ao mesmo tempo", async () => {
    const { manager, auth } = setup();

    await Promise.all([manager.restore(), manager.restore(), manager.refresh()]);

    expect(auth.refresh).toHaveBeenCalledTimes(1);
  });

  it("tenta de novo quando outra aba acabou de renovar a sessão", async () => {
    const refresh = vi.fn<AuthApi["refresh"]>().mockRejectedValueOnce(race()).mockResolvedValueOnce(session("t2"));
    const { manager } = setup({ refresh });

    await manager.restore();

    expect(refresh).toHaveBeenCalledTimes(2);
    expect(manager.getSnapshot().status).toBe("authenticated");
  });

  it("avisa quem está inscrito quando a sessão muda", async () => {
    const { manager } = setup();
    const listener = vi.fn();
    manager.subscribe(listener);

    await manager.login("ana.souza@nexo.com.br", "Senha-123");

    expect(listener).toHaveBeenCalled();
    expect(manager.getSnapshot().user).toEqual(ana);
  });

  it("envia o access token em memória nas chamadas autenticadas", async () => {
    const { manager, request } = setup();
    await manager.login("ana.souza@nexo.com.br", "Senha-123");

    await manager.authorizedRequest("/employee/tickets");

    expect(request).toHaveBeenCalledWith("/employee/tickets", { token: "token-login" });
  });

  it("renova e repete uma vez quando o access token expirou", async () => {
    const { manager, request } = setup();
    await manager.login("ana.souza@nexo.com.br", "Senha-123");
    request.mockRejectedValueOnce(expired());

    await manager.authorizedRequest("/employee/tickets");

    expect(request).toHaveBeenLastCalledWith("/employee/tickets", { token: "token-refresh" });
  });

  it("desloga quando nem o refresh funciona mais", async () => {
    const { manager, request } = setup({ refresh: vi.fn(async () => Promise.reject(expired())) });
    await manager.login("ana.souza@nexo.com.br", "Senha-123");
    request.mockRejectedValueOnce(expired());

    await expect(manager.authorizedRequest("/employee/tickets")).rejects.toMatchObject({ status: 401 });
    expect(manager.getSnapshot().status).toBe("unauthenticated");
  });

  it("no logout, limpa a sessão local mesmo se a API falhar", async () => {
    const { manager, auth } = setup({ logout: vi.fn(async () => Promise.reject(ApiError.network())) });
    await manager.login("ana.souza@nexo.com.br", "Senha-123");

    await manager.logout();

    expect(auth.logout).toHaveBeenCalledWith("token-login");
    expect(manager.getSnapshot()).toEqual({ status: "unauthenticated", user: null });
  });
});
