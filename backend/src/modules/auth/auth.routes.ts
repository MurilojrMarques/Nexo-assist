import { Router, type RequestHandler } from "express";
import type { RateLimiters } from "../../http/middlewares/rate-limit.js";
import { createAuthController, type AuthControllerDependencies } from "./auth.controller.js";

export type AuthRoutesDependencies = AuthControllerDependencies & {
  authenticate: RequestHandler;
  limiters: Pick<RateLimiters, "login" | "refresh">;
};

export function createAuthRoutes({ authenticate, limiters, ...controllerDeps }: AuthRoutesDependencies): Router {
  const controller = createAuthController(controllerDeps);
  const router = Router();

  router.post("/login", limiters.login, controller.login);
  router.post("/refresh", limiters.refresh, controller.refresh);
  router.post("/logout", authenticate, controller.logout);
  router.get("/me", authenticate, controller.me);

  return router;
}
