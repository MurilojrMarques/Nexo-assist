import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

type PageHeaderProps = {
  trail: string[];
  current: string;
  actions?: ReactNode;
};

export function PageHeader({ trail, current, actions }: PageHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line px-4 md:px-8">
      <nav aria-label="Você está em" className="min-w-0 flex-1">
        <ol className="flex items-center gap-2 text-[13.5px] whitespace-nowrap">
          {trail.map((item) => (
            <li key={item} className="hidden items-center gap-2 text-muted sm:flex">
              {item}
              <ChevronRight aria-hidden="true" className="size-3.5" />
            </li>
          ))}
          <li aria-current="page" className="truncate font-semibold text-ink">
            {current}
          </li>
        </ol>
      </nav>
      {actions}
    </header>
  );
}
