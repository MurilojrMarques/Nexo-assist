import type { ReactNode } from "react";

type TicketFieldProps = {
  label: string;
  children: ReactNode;
};

export function TicketField({ label, children }: TicketFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[12.5px] text-muted">{label}</dt>
      <dd className="flex flex-wrap items-center gap-1.5 text-[14.5px] font-medium text-ink">{children}</dd>
    </div>
  );
}
