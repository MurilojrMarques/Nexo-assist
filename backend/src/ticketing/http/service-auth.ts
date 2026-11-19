import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { UnauthorizedError } from "../../shared/errors/http-errors.js";

const digest = (value: string) => createHash("sha256").update(value).digest();

export function serviceAuth(expectedToken: string): RequestHandler {
  const expected = digest(expectedToken);

  return (req, res, next) => {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!token || !timingSafeEqual(digest(token), expected)) {
      res.setHeader("WWW-Authenticate", 'Bearer realm="nexo-ticketing"');
      throw new UnauthorizedError("Token de serviço inválido.");
    }

    next();
  };
}
