import type { RequestHandler } from "express";
import type { Clock } from "../../shared/time/clock.js";
import { ServiceUnavailableError } from "../../shared/errors/http-errors.js";

export type LegacyAvailabilitySettings = {
  failureRate: number;
  outageSeconds: number;
  random?: () => number;
  clock: Clock;
};

export function legacyAvailability({
  failureRate,
  outageSeconds,
  random = Math.random,
  clock,
}: LegacyAvailabilitySettings): RequestHandler {
  let outageUntil = 0;

  return (_req, res, next) => {
    const now = clock.now().getTime();

    if (now >= outageUntil && failureRate > 0 && random() < failureRate) {
      outageUntil = now + outageSeconds * 1000;
    }

    if (now < outageUntil) {
      res.setHeader("Retry-After", String(Math.ceil((outageUntil - now) / 1000)));
      throw new ServiceUnavailableError("Sistema de chamados temporariamente indisponível.");
    }

    next();
  };
}
