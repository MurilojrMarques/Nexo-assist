import { pino, type Logger } from "pino";

export const redactedPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
  "password",
  "*.password",
  "passwordHash",
  "*.passwordHash",
  "accessToken",
  "*.accessToken",
  "refreshToken",
  "*.refreshToken",
];

export function createLogger(level: string): Logger {
  return pino({
    level,
    redact: { paths: redactedPaths, censor: "[REDACTED]" },
  });
}

export type { Logger };
