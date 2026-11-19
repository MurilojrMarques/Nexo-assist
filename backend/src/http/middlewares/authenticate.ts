import type { Request, RequestHandler, Response } from "express";
import type { AccessTokenService, Clock, SessionRepository } from "../../modules/auth/auth.ports.js";
import type { AuthContext } from "../../modules/auth/auth.types.js";
import { UnauthorizedError } from "../../shared/errors/http-errors.js";

export type AuthenticateDependencies = {
  tokens: Pick<AccessTokenService, "verify">;
  sessions: Pick<SessionRepository, "findActiveSessionUser">;
  clock: Clock;
};

const BEARER_PATTERN = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;

export function readBearerToken(header: string | undefined): string | null {
  return header ? (BEARER_PATTERN.exec(header)?.[1] ?? null) : null;
}

function reject(res: Response, message?: string): UnauthorizedError {
  res.setHeader("WWW-Authenticate", 'Bearer realm="nexo-assist"');
  return new UnauthorizedError(message);
}

export function createAuthenticate({ tokens, sessions, clock }: AuthenticateDependencies): RequestHandler {
  return async (req, res, next) => {
    const token = readBearerToken(req.headers.authorization);

    if (!token) {
      throw reject(res);
    }

    const claims = await tokens.verify(token).catch(() => {
      throw reject(res, "Token inválido ou expirado.");
    });
    const user = await sessions.findActiveSessionUser(claims.sessionId, clock.now());

    if (!user || user.id !== claims.userId) {
      throw reject(res, "Sessão expirada. Entre novamente.");
    }

    req.auth = { userId: user.id, role: user.role, sessionId: claims.sessionId };
    next();
  };
}

export function requireAuth(req: Request): AuthContext {
  if (!req.auth) {
    throw new UnauthorizedError();
  }

  return req.auth;
}
