import type { Clock } from "../modules/auth/auth.ports.js";

export const systemClock: Clock = {
  now: () => new Date(),
};
