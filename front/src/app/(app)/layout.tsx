import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { currentUser } from "@/features/auth/mock/current-user";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <AppSidebar user={currentUser} />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
