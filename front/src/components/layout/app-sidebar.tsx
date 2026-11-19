"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, MessageSquare, UserRound, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { getInitials } from "@/features/auth/lib/get-initials";
import type { CurrentUser } from "@/features/auth/mock/current-user";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/chat", label: "Atendimento", icon: MessageSquare },
  { href: "/perfil", label: "Meu perfil", icon: UserRound },
];

type AppSidebarProps = {
  user: CurrentUser;
};

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const label = collapsed ? "hidden" : "hidden md:inline";

  return (
    <aside
      id="app-sidebar"
      className={`flex h-full w-[68px] shrink-0 flex-col border-r border-line px-3.5 pt-5 pb-3.5 transition-[width] duration-200 ${
        collapsed ? "" : "md:w-[clamp(220px,18.03vw,320px)]"
      }`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((current) => !current)}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        aria-expanded={!collapsed}
        aria-controls="app-sidebar"
        className="flex h-9 items-center gap-2.5 rounded-lg px-2 hover:bg-ink/5"
      >
        <LogoMark className="size-5 text-brand" />
        <span className={`text-base font-bold tracking-[-0.2px] whitespace-nowrap text-ink ${label}`}>
          Nexo Assist
        </span>
      </button>

      <nav aria-label="Menu principal" className="mt-3.5 flex flex-col gap-0.5">
        {navItems.map(({ href, label: text, icon: Icon }) => {
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              aria-label={text}
              title={text}
              aria-current={active ? "page" : undefined}
              className={`flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] whitespace-nowrap ${
                active ? "bg-accent/7 font-semibold text-link" : "font-medium text-ink-soft hover:bg-ink/5"
              }`}
            >
              <Icon aria-hidden="true" className={`size-4 shrink-0 ${active ? "text-link" : "text-muted"}`} />
              <span className={label}>{text}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 border-t border-line px-[3px] pt-3.5 pb-1">
        <span
          aria-hidden="true"
          className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-accent/7 text-[12.5px] font-bold text-link"
        >
          {getInitials(user.name)}
        </span>
        <span className={`min-w-0 flex-col gap-px ${collapsed ? "hidden" : "hidden md:flex"}`}>
          <span className="truncate text-[13.5px] font-semibold text-ink">{user.name}</span>
          <span className="truncate text-[11.5px] text-muted">{user.email}</span>
        </span>
      </div>

      <Link
        href="/login"
        aria-label="Sair"
        title="Sair"
        className="mt-1 flex h-[34px] items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium text-ink-soft hover:bg-ink/5"
      >
        <LogOut aria-hidden="true" className="size-4 shrink-0 text-muted" />
        <span className={label}>Sair</span>
      </Link>
    </aside>
  );
}
