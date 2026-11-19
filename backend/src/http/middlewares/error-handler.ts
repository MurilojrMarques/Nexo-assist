import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../../shared/errors/app-error.js";

type HttpClientError = { status: number; expose: true };

function isHttpClientError(error: unknown): error is HttpClientError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500 &&
    "expose" in error &&
    error.expose === true
  );
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Dados inválidos.",
        issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      },
    });
    return;
  }

  if (isHttpClientError(error)) {
    const code = error.status === 413 ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST";
    res.status(error.status).json({ error: { code, message: "Requisição inválida." } });
    return;
  }

  req.log.error({ err: error }, "Erro não tratado");
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor." } });
};
