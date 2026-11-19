import type { ReactNode } from "react";
import { AppSidebar, type SidebarItem } from "@/components/layout/app-sidebar";
import { currentUser } from "@/features/auth/mock/current-user";

const employeeMenu: SidebarItem[] = [
  { href: "/chat", label: "Atendimento", icon: "chat" },
  { href: "/perfil", label: "Meu perfil", icon: "profile" },
];

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <AppSidebar user={currentUser} items={employeeMenu} />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
