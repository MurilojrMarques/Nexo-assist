import type { AppConfig, AppDependencies } from "./app.js";
import type { Env } from "./config/env.schema.js";
import { systemClock } from "./shared/time/clock.js";
import { createPrismaClient, type Database } from "./infra/database/prisma-client.js";
import { createLogger } from "./infra/logging/logger.js";
import { Argon2PasswordHasher } from "./infra/security/argon2-password-hasher.js";
import { JoseAccessTokenService } from "./infra/security/jose-access-token-service.js";
import { PrismaAuditLogger } from "./modules/audit/prisma-audit-logger.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { PrismaSessionRepository } from "./modules/auth/prisma-session.repository.js";
import { PrismaUserRepository } from "./modules/auth/prisma-user.repository.js";
import { MastraServiceDeskAgent, UnavailableServiceDeskAgent } from "./agent/mastra-service-desk-agent.js";
import { ServiceDeskActions } from "./agent/service-desk-actions.js";
import { ConversationService } from "./modules/conversations/conversation.service.js";
import { PrismaConversationStore } from "./modules/conversations/prisma-conversation-store.js";
import { PrismaKnowledgeBase } from "./modules/knowledge/prisma-knowledge-base.js";
import { HttpTicketGateway } from "./modules/tickets/http-ticket-gateway.js";

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

  const tickets = new HttpTicketGateway({
    baseUrl: env.TICKETING_SERVICE_URL,
    serviceToken: env.TICKETING_SERVICE_TOKEN,
    timeoutMs: env.TICKETING_TIMEOUT_MS,
    maxAttempts: env.TICKETING_MAX_ATTEMPTS,
    baseDelayMs: env.TICKETING_RETRY_BASE_MS,
  });
  const store = new PrismaConversationStore(db);
  const actions = new ServiceDeskActions({ tickets, knowledge: new PrismaKnowledgeBase(db), drafts: store, clock: systemClock });
  const agent = env.ANTHROPIC_API_KEY
    ? new MastraServiceDeskAgent(
        {
          apiKey: env.ANTHROPIC_API_KEY,
          agentModel: env.AGENT_MODEL,
          triageModel: env.TRIAGE_MODEL,
          maxSteps: env.AGENT_MAX_STEPS,
          maxOutputTokens: env.AGENT_MAX_OUTPUT_TOKENS,
        },
        actions,
        systemClock,
        logger,
      )
    : new UnavailableServiceDeskAgent();

  if (!env.ANTHROPIC_API_KEY) {
    logger.warn("ANTHROPIC_API_KEY ausente: o assistente vai responder 503 até a chave ser configurada.");
  }

  return {
    db,
    dependencies: {
      authService,
      users,
      sessions,
      tokens,
      tickets,
      conversations: new ConversationService({
        store,
        agent,
        tickets,
        clock: systemClock,
        logger,
        historyWindow: env.AGENT_HISTORY_WINDOW,
      }),
      messagesPerMinute: env.MESSAGES_PER_MINUTE,
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
