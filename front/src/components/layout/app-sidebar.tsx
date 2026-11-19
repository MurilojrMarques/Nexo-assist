"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, MessageSquare, UserRound } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { Avatar } from "@/components/ui/avatar";

const icons = {
  chat: MessageSquare,
  profile: UserRound,
};

export type SidebarItem = {
  href: string;
  label: string;
  icon: keyof typeof icons;
  badge?: number;
};

export type SidebarUser = {
  name: string;
  email: string;
  online?: boolean;
};

type AppSidebarProps = {
  user: SidebarUser;
  items: SidebarItem[];
  defaultCollapsed?: boolean;
};

export function AppSidebar({ user, items, defaultCollapsed = false }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const label = collapsed ? "hidden" : "hidden md:inline";

  function toggle() {
    setCollapsed((current) => !current);
  }

  function expand() {
    setCollapsed(false);
  }

  return (
    <aside
      id="app-sidebar"
      className={`flex h-full w-16 shrink-0 flex-col border-r border-line px-3 pt-5 pb-3.5 transition-[width] duration-200 ${
        collapsed ? "" : "md:w-[clamp(220px,18.03vw,320px)] md:px-3.5"
      }`}
    >
      <button
        type="button"
        onClick={toggle}
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
        {items.map(({ href, label: text, icon, badge }) => {
          const Icon = icons[icon];
          const active = pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={collapsed ? expand : undefined}
              aria-label={badge ? `${text} (${badge})` : text}
              title={text}
              aria-current={active ? "page" : undefined}
              className={`relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] whitespace-nowrap ${
                active ? "bg-accent/7 font-semibold text-link" : "font-medium text-ink-soft hover:bg-ink/5"
              }`}
            >
              <Icon aria-hidden="true" className={`size-4 shrink-0 ${active ? "text-link" : "text-muted"}`} />
              <span className={label}>{text}</span>
              {badge ? (
                <span
                  aria-hidden="true"
                  className={`absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white ${
                    collapsed ? "" : "md:static md:ml-auto"
                  }`}
                >
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line pt-2.5">
        <button
          type="button"
          onClick={toggle}
          aria-label={`Conta de ${user.name}`}
          aria-expanded={!collapsed}
          aria-controls="app-sidebar"
          className="flex w-full items-center gap-2.5 rounded-lg px-[3px] py-1 text-left hover:bg-ink/5"
        >
          <Avatar name={user.name} size="sm" tone="brand" online={user.online} />
          <span className={`min-w-0 flex-col gap-px ${collapsed ? "hidden" : "hidden md:flex"}`}>
            <span className="truncate text-[13.5px] font-semibold text-ink">{user.name}</span>
            <span className="truncate text-[11.5px] text-muted">{user.email}</span>
          </span>
        </button>
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
