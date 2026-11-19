import type { RequestFn } from "@/lib/api/http";
import type { AuthSession, SessionUser } from "@/features/auth/types";

type TokenResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: SessionUser;
};

export interface AuthApi {
  login(email: string, password: string): Promise<AuthSession>;
  refresh(): Promise<AuthSession>;
  logout(accessToken: string): Promise<void>;
}

function toSession(response: TokenResponse): AuthSession {
  return { accessToken: response.accessToken, expiresIn: response.expiresIn, user: response.user };
}

export function createAuthApi(send: RequestFn): AuthApi {
  return {
    async login(email, password) {
      return toSession(await send<TokenResponse>("/auth/login", { method: "POST", body: { email, password } }));
    },
    async refresh() {
      return toSession(await send<TokenResponse>("/auth/refresh", { method: "POST" }));
    },
    async logout(accessToken) {
      await send<void>("/auth/logout", { method: "POST", token: accessToken });
    },
  };
}
