import type { TicketSummary } from "@/features/tickets/types";
import { formatDay } from "@/features/tickets/format-date";
import { TicketStatusLabel } from "./ticket-status-label";

type TicketListProps = {
  tickets: TicketSummary[];
};

export function TicketList({ tickets }: TicketListProps) {
  return (
    <ul
      aria-label="Seus chamados"
      className="w-full divide-y divide-line overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_#1b24310d,0_6px_18px_#1b24310a] outline outline-ink/9"
    >
      {tickets.map((ticket) => (
        <li key={ticket.code} className="flex items-center gap-3 px-3.5 py-3">
          <span className="shrink-0 text-[12.5px] text-muted">{ticket.code}</span>
          <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-ink">{ticket.title}</span>
          <TicketStatusLabel status={ticket.status} className="hidden text-[12.5px] sm:flex" />
          <span className="w-12 shrink-0 text-right text-[12.5px] text-muted">{formatDay(ticket.openedAt)}</span>
        </li>
      ))}
    </ul>
  );
}
