"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RoleGate } from "@/features/auth/components/role-gate";
import { useSession } from "@/features/auth/session/session-provider";
import type { Role } from "@/features/auth/types";
import { AppSidebar, type SidebarItem } from "./app-sidebar";

type AuthenticatedShellProps = {
  role: Role;
  items: SidebarItem[];
  defaultCollapsed?: boolean;
  mainClassName: string;
  children: ReactNode;
};

export function AuthenticatedShell({ role, items, defaultCollapsed, mainClassName, children }: AuthenticatedShellProps) {
  const { logout } = useSession();
  const router = useRouter();

  async function signOut() {
    await logout();
    router.replace("/login");
  }

  return (
    <RoleGate role={role}>
      {(user) => (
        <div className="flex h-dvh overflow-hidden">
          <AppSidebar
            user={{ name: user.name, email: user.email, online: role === "ANALYST" }}
            items={items}
            defaultCollapsed={defaultCollapsed}
            onSignOut={signOut}
          />
          <main className={mainClassName}>{children}</main>
        </div>
      )}
    </RoleGate>
  );
}
