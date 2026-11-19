import type { ReactNode } from "react";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import type { SidebarItem } from "@/components/layout/app-sidebar";
import { isActive } from "@/features/console/lib/conversation-status";
import { mockConversations } from "@/features/console/mock/console-data";

const activeConversations = mockConversations.filter((conversation) => isActive(conversation.status)).length;

const analystMenu: SidebarItem[] = [
  { href: "/console", label: "Conversas", icon: "chat", badge: activeConversations },
];

type ConsoleLayoutProps = {
  children: ReactNode;
};

export default function ConsoleLayout({ children }: ConsoleLayoutProps) {
  return (
    <AuthenticatedShell role="ANALYST" items={analystMenu} defaultCollapsed mainClassName="flex min-w-0 flex-1">
      {children}
    </AuthenticatedShell>
  );
}
