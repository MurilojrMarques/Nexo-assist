import type { RequestHandler } from "express";
import { AppError } from "../../shared/errors/app-error.js";

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(`Rota não encontrada: ${req.method} ${req.path}`, 404, "NOT_FOUND"));
};
