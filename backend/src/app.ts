import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./http/middlewares/error-handler.js";
import { notFound } from "./http/middlewares/not-found.js";
import { routes } from "./http/routes/index.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());

  app.use("/api", routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
