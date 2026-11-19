import type { ReactNode } from "react";
import { vi } from "vitest";
import { ApiError } from "@/lib/api/api-error";
import type { RequestFn } from "@/lib/api/http";
import type { AuthApi } from "@/features/auth/api/auth-api";
import { SessionManager } from "@/features/auth/session/session-manager";
import { SessionProvider } from "@/features/auth/session/session-provider";
import type { AuthSession, Role, SessionUser } from "@/features/auth/types";

export function testUser(role: Role = "EMPLOYEE"): SessionUser {
  return role === "EMPLOYEE"
    ? { id: "u-ana", email: "ana.souza@nexo.com.br", name: "Ana Souza", department: "Financeiro", role, team: null }
    : { id: "u-rafael", email: "rafael.lima@nexo.com.br", name: "Rafael Lima", department: "TI", role, team: "Suporte N2" };
}

export function testSession(role: Role = "EMPLOYEE"): AuthSession {
  return { accessToken: "token", expiresIn: 900, user: testUser(role) };
}

type TestSessionOptions = {
  signedInAs?: Role;
  auth?: Partial<AuthApi>;
};

export function createTestSession({ signedInAs, auth: overrides = {} }: TestSessionOptions = {}) {
  const auth = {
    login: vi.fn<AuthApi["login"]>(async () => testSession()),
    refresh: vi.fn<AuthApi["refresh"]>(async () =>
      signedInAs ? testSession(signedInAs) : Promise.reject(new ApiError(401, "UNAUTHORIZED", "Sessão expirada.")),
    ),
    logout: vi.fn<AuthApi["logout"]>(async () => undefined),
    ...overrides,
  };
  const manager = new SessionManager({ auth, request: vi.fn() as unknown as RequestFn, wait: async () => undefined });

  function Wrapper({ children }: { children: ReactNode }) {
    return <SessionProvider manager={manager}>{children}</SessionProvider>;
  }

  return { auth, manager, Wrapper };
}
