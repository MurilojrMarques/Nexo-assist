import type { Role } from "@/features/auth/types";

const homeByRole: Record<Role, string> = {
  EMPLOYEE: "/chat",
  ANALYST: "/console",
};

const areasByRole: Record<Role, string[]> = {
  EMPLOYEE: ["/chat", "/perfil"],
  ANALYST: ["/console"],
};

const SAME_ORIGIN = "http://nexo.local";

export function homePathFor(role: Role): string {
  return homeByRole[role];
}

export function canAccessPath(role: Role, pathname: string): boolean {
  return areasByRole[role].some((area) => pathname === area || pathname.startsWith(`${area}/`));
}

export function postLoginPath(role: Role, next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return homePathFor(role);
  }

  let target: URL;

  try {
    target = new URL(next, SAME_ORIGIN);
  } catch {
    return homePathFor(role);
  }

  if (target.origin !== SAME_ORIGIN || !canAccessPath(role, target.pathname)) {
    return homePathFor(role);
  }

  return `${target.pathname}${target.search}`;
}
