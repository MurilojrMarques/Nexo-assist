import type { AppConfig, AppDependencies } from "./app.js";
import type { Env } from "./config/env.schema.js";
import { systemClock } from "./infra/clock.js";
import { createPrismaClient, type Database } from "./infra/database/prisma-client.js";
import { createLogger } from "./infra/logging/logger.js";
import { Argon2PasswordHasher } from "./infra/security/argon2-password-hasher.js";
import { JoseAccessTokenService } from "./infra/security/jose-access-token-service.js";
import { PrismaAuditLogger } from "./modules/audit/prisma-audit-logger.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { PrismaSessionRepository } from "./modules/auth/prisma-session.repository.js";
import { PrismaUserRepository } from "./modules/auth/prisma-user.repository.js";
import { PrismaTicketRepository } from "./modules/tickets/prisma-ticket.repository.js";

export type Container = {
  db: Database;
  dependencies: AppDependencies;
  config: AppConfig;
};

export function createContainer(env: Env): Container {
  const db = createPrismaClient(env.DATABASE_URL);
  const logger = createLogger(env.LOG_LEVEL);
  const users = new PrismaUserRepository(db);
  const sessions = new PrismaSessionRepository(db);
  const tokens = new JoseAccessTokenService({
    secret: env.JWT_ACCESS_SECRET,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    ttlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
  });

  const authService = new AuthService({
    users,
    sessions,
    tokens,
    hasher: new Argon2PasswordHasher(),
    audit: new PrismaAuditLogger(db, logger),
    clock: systemClock,
    settings: {
      refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
      sessionMaxAgeDays: env.SESSION_MAX_AGE_DAYS,
      maxFailedAttempts: env.LOGIN_MAX_ATTEMPTS,
      lockoutMinutes: env.LOGIN_LOCKOUT_MINUTES,
      refreshReuseGraceSeconds: env.REFRESH_REUSE_GRACE_SECONDS,
    },
  });

  return {
    db,
    dependencies: {
      authService,
      users,
      sessions,
      tokens,
      tickets: new PrismaTicketRepository(db),
      clock: systemClock,
      logger,
      cookies: { secure: env.NODE_ENV === "production" },
    },
    config: {
      corsOrigins: env.CORS_ORIGIN,
      trustProxy: env.TRUST_PROXY,
    },
  };
}
