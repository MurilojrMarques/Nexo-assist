import type { CookieOptions, Request, Response } from "express";

export const REFRESH_COOKIE_NAME = "nexo_rt";

export type CookieSettings = {
  secure: boolean;
};

function baseOptions(settings: CookieSettings): CookieOptions {
  return {
    httpOnly: true,
    secure: settings.secure,
    sameSite: "strict",
    path: "/api/auth",
  };
}

export function setRefreshCookie(res: Response, token: string, expiresAt: Date, settings: CookieSettings): void {
  res.cookie(REFRESH_COOKIE_NAME, token, { ...baseOptions(settings), expires: expiresAt });
}

export function clearRefreshCookie(res: Response, settings: CookieSettings): void {
  res.clearCookie(REFRESH_COOKIE_NAME, baseOptions(settings));
}

export function readRefreshCookie(req: Request): string | null {
  const cookies: Record<string, unknown> = req.cookies ?? {};
  const value = cookies[REFRESH_COOKIE_NAME];

  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}
