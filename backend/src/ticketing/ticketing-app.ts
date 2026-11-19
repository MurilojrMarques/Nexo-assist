import { randomUUID } from "node:crypto";
import express, { type Express, type RequestHandler } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { errorHandler } from "../http/middlewares/error-handler.js";
import { notFound } from "../http/middlewares/not-found.js";
import type { Logger } from "../infra/logging/logger.js";
import { createTicketingRoutes } from "./http/ticketing.routes.js";
import { serviceAuth } from "./http/service-auth.js";
import type { TicketService } from "./ticket.service.js";

export type TicketingAppDependencies = {
  service: TicketService;
  logger: Logger;
  serviceToken: string;
  availability: RequestHandler;
};

export function createTicketingApp({ service, logger, serviceToken, availability }: TicketingAppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(pinoHttp({ logger, genReqId: (req) => req.headers["x-request-id"]?.toString() ?? randomUUID() }));
  app.use(helmet());
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(serviceAuth(serviceToken));
  app.use(availability);
  app.use(createTicketingRoutes(service));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
