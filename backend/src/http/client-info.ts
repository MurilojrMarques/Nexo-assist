import type { Request } from "express";
import type { ClientInfo } from "../modules/auth/auth.types.js";

export function clientInfo(req: Request): ClientInfo {
  return {
    ipAddress: req.ip?.slice(0, 45),
    userAgent: req.get("user-agent")?.slice(0, 255),
  };
}
