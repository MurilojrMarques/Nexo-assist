import type { TicketStatus } from "@/features/tickets/types";
import { ticketStatusStyle } from "@/features/tickets/status";

type TicketStatusLabelProps = {
  status: TicketStatus;
  tone?: "colored" | "muted";
  className?: string;
};

export function TicketStatusLabel({ status, tone = "colored", className = "" }: TicketStatusLabelProps) {
  const style = ticketStatusStyle[status];

  return (
    <span className={`flex items-center gap-1.5 whitespace-nowrap ${tone === "colored" ? style.text : "text-muted"} ${className}`}>
      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}
