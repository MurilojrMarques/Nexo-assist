"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogoMark } from "@/components/brand/logo-mark";
import { useSession } from "@/features/auth/session/session-provider";
import { canAccessPath, homePathFor } from "@/features/auth/lib/home-path";
import type { Role, SessionUser } from "@/features/auth/types";

type RoleGateProps = {
  role: Role;
  children: (user: SessionUser) => ReactNode;
};

export function RoleGate({ role, children }: RoleGateProps) {
  const { status, user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = status === "authenticated" && user?.role === role && canAccessPath(role, pathname);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (status === "authenticated" && user && !allowed) {
      router.replace(homePathFor(user.role));
    }
  }, [status, user, allowed, pathname, router]);

  if (!allowed || !user) {
    return <SessionPending />;
  }

  return children(user);
}

function SessionPending() {
  return (
    <div role="status" className="flex h-dvh flex-1 flex-col items-center justify-center gap-3 text-[13.5px] text-muted">
      <LogoMark className="size-7 animate-pulse text-brand" />
      Verificando sua sessão…
    </div>
  );
}
