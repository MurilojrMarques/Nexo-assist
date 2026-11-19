import type { ReactNode } from "react";
import { AppSidebar, type SidebarItem } from "@/components/layout/app-sidebar";
import { isActive } from "@/features/console/lib/conversation-status";
import { mockAnalyst, mockConversations } from "@/features/console/mock/console-data";

const activeConversations = mockConversations.filter((conversation) => isActive(conversation.status)).length;

const analystMenu: SidebarItem[] = [
  { href: "/console", label: "Conversas", icon: "chat", badge: activeConversations },
];

type ConsoleLayoutProps = {
  children: ReactNode;
};

export default function ConsoleLayout({ children }: ConsoleLayoutProps) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <AppSidebar user={{ ...mockAnalyst, online: true }} items={analystMenu} defaultCollapsed />
      <main className="flex min-w-0 flex-1">{children}</main>
    </div>
  );
}
