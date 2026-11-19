import { randomUUID } from "node:crypto";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { errorHandler } from "./http/middlewares/error-handler.js";
import { noStore } from "./http/middlewares/no-store.js";
import { notFound } from "./http/middlewares/not-found.js";
import { createRateLimiters, type RateLimitSettings } from "./http/middlewares/rate-limit.js";
import { createRoutes } from "./http/routes/index.js";
import type { Logger } from "./infra/logging/logger.js";
import type { Clock, SessionRepository, UserRepository, AccessTokenService } from "./modules/auth/auth.ports.js";
import type { AuthService } from "./modules/auth/auth.service.js";
import type { CookieSettings } from "./modules/auth/refresh-cookie.js";
import type { ConversationService } from "./modules/conversations/conversation.service.js";
import type { TicketGateway } from "./modules/tickets/ticket.types.js";

export type AppDependencies = {
  authService: AuthService;
  users: Pick<UserRepository, "findActiveById">;
  sessions: Pick<SessionRepository, "findActiveSessionUser">;
  tokens: Pick<AccessTokenService, "verify">;
  tickets: TicketGateway;
  conversations: ConversationService;
  messagesPerMinute: number;
  clock: Clock;
  logger: Logger;
  cookies: CookieSettings;
};

export type AppConfig = {
  corsOrigins: string[];
  trustProxy: boolean;
  rateLimits?: RateLimitSettings;
};

export function createApp(deps: AppDependencies, config: AppConfig): Express {
  const app = express();
  const limiters = createRateLimiters(config.rateLimits);

  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy ? 1 : false);

  app.use(
    pinoHttp({
      logger: deps.logger,
      genReqId: (req, res) => {
        const id = randomUUID();
        res.setHeader("X-Request-Id", id);
        return id;
      },
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE"],
      allowedHeaders: ["Authorization", "Content-Type"],
      maxAge: 600,
    }),
  );
  app.use(noStore);
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.use("/api", limiters.api, createRoutes(deps, limiters));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
