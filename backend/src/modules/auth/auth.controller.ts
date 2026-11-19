import type { Request, Response } from "express";
import { clientInfo } from "../../http/client-info.js";
import { requireAuth } from "../../http/middlewares/authenticate.js";
import { RefreshTokenRaceError, UnauthorizedError } from "../../shared/errors/http-errors.js";
import type { UserRepository } from "./auth.ports.js";
import { loginSchema } from "./auth.schemas.js";
import type { AuthService } from "./auth.service.js";
import type { AuthTokens } from "./auth.types.js";
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie, type CookieSettings } from "./refresh-cookie.js";

export type AuthControllerDependencies = {
  authService: AuthService;
  users: Pick<UserRepository, "findActiveById">;
  cookies: CookieSettings;
};

function sendTokens(res: Response, tokens: AuthTokens, cookies: CookieSettings): void {
  setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt, cookies);
  res.status(200).json({
    accessToken: tokens.accessToken,
    tokenType: "Bearer",
    expiresIn: tokens.accessTokenExpiresIn,
    user: tokens.user,
  });
}

export function createAuthController({ authService, users, cookies }: AuthControllerDependencies) {
  return {
    async login(req: Request, res: Response) {
      const { email, password } = loginSchema.parse(req.body);
      const tokens = await authService.login(email, password, clientInfo(req));
      sendTokens(res, tokens, cookies);
    },

    async refresh(req: Request, res: Response) {
      const refreshToken = readRefreshCookie(req);

      if (!refreshToken) {
        throw new UnauthorizedError("Sessão expirada. Entre novamente.");
      }

      try {
        sendTokens(res, await authService.refresh(refreshToken, clientInfo(req)), cookies);
      } catch (error) {
        if (!(error instanceof RefreshTokenRaceError)) {
          clearRefreshCookie(res, cookies);
        }

        throw error;
      }
    },

    async logout(req: Request, res: Response) {
      await authService.logout(requireAuth(req), clientInfo(req));
      clearRefreshCookie(res, cookies);
      res.status(204).end();
    },

    async me(req: Request, res: Response) {
      const user = await users.findActiveById(requireAuth(req).userId);

      if (!user) {
        throw new UnauthorizedError();
      }

      res.json({ user });
    },
  };
}
