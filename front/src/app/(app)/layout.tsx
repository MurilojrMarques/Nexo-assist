import type { ReactNode } from "react";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import type { SidebarItem } from "@/components/layout/app-sidebar";

const employeeMenu: SidebarItem[] = [
  { href: "/chat", label: "Atendimento", icon: "chat" },
  { href: "/perfil", label: "Meu perfil", icon: "profile" },
];

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <AuthenticatedShell role="EMPLOYEE" items={employeeMenu} mainClassName="flex min-w-0 flex-1 flex-col">
      {children}
    </AuthenticatedShell>
  );
}
