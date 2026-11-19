import type { Request, RequestHandler } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { TooManyRequestsError } from "../../shared/errors/http-errors.js";

export function createMessageLimiter(perMinute: number): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit: perMinute,
    keyGenerator: (req) => req.auth?.userId ?? ipKeyGenerator(req.ip ?? "unknown"),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new TooManyRequestsError("Você está mandando mensagens rápido demais. Aguarde um minuto.")),
  });
}

export type RateLimiters = {
  api: RequestHandler;
  login: RequestHandler;
  refresh: RequestHandler;
};

export type RateLimitSettings = {
  apiPerMinute: number;
  loginPer15Minutes: number;
  refreshPerMinute: number;
};

export const defaultRateLimitSettings: RateLimitSettings = {
  apiPerMinute: 300,
  loginPer15Minutes: 10,
  refreshPerMinute: 30,
};

function clientIp(req: Request): string {
  return ipKeyGenerator(req.ip ?? "unknown");
}

function loginKey(req: Request): string {
  const body: unknown = req.body;
  const email =
    typeof body === "object" && body !== null && "email" in body && typeof body.email === "string"
      ? body.email.trim().toLowerCase().slice(0, 254)
      : "";

  return `${clientIp(req)}:${email}`;
}

function limiter(windowMs: number, limit: number, keyGenerator: (req: Request) => string): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    keyGenerator,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new TooManyRequestsError()),
  });
}

export function createRateLimiters(settings: RateLimitSettings = defaultRateLimitSettings): RateLimiters {
  return {
    api: limiter(60_000, settings.apiPerMinute, clientIp),
    login: limiter(15 * 60_000, settings.loginPer15Minutes, loginKey),
    refresh: limiter(60_000, settings.refreshPerMinute, clientIp),
  };
}
