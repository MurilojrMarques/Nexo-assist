import { Router } from "express";
import type { AppDependencies } from "../../app.js";
import { createAuthRoutes } from "../../modules/auth/auth.routes.js";
import {
  createEmployeeConversationRoutes,
  createSupportConversationRoutes,
} from "../../modules/conversations/conversation.routes.js";
import { createEmployeeTicketRoutes, createSupportTicketRoutes } from "../../modules/tickets/ticket.routes.js";
import { createAuthenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { createMessageLimiter, type RateLimiters } from "../middlewares/rate-limit.js";
import { healthRoutes } from "./health.routes.js";

export function createRoutes(deps: AppDependencies, limiters: RateLimiters): Router {
  const routes = Router();
  const authenticate = createAuthenticate({ tokens: deps.tokens, sessions: deps.sessions, clock: deps.clock });

  routes.use("/health", healthRoutes);
  routes.use(
    "/auth",
    createAuthRoutes({
      authService: deps.authService,
      users: deps.users,
      cookies: deps.cookies,
      authenticate,
      limiters,
    }),
  );

  routes.use(authenticate);
  routes.use(
    "/employee",
    authorize("EMPLOYEE"),
    createEmployeeTicketRoutes(deps.tickets),
    createEmployeeConversationRoutes(deps.conversations, createMessageLimiter(deps.messagesPerMinute)),
  );
  routes.use(
    "/support",
    authorize("ANALYST"),
    createSupportTicketRoutes(deps.tickets),
    createSupportConversationRoutes(deps.conversations),
  );

  return routes;
}
