import type { RequestHandler } from "express";
import type { Role } from "../../modules/auth/auth.types.js";
import { ForbiddenError } from "../../shared/errors/http-errors.js";
import { requireAuth } from "./authenticate.js";

export function authorize(...allowedRoles: Role[]): RequestHandler {
  return (req, _res, next) => {
    const auth = requireAuth(req);

    if (!allowedRoles.includes(auth.role)) {
      throw new ForbiddenError();
    }

    next();
  };
}
