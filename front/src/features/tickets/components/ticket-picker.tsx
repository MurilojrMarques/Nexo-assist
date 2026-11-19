import type { TicketSummary } from "@/features/tickets/types";
import { formatDay } from "@/features/tickets/format-date";
import { TicketStatusLabel } from "./ticket-status-label";

type TicketPickerProps = {
  tickets: TicketSummary[];
  selected?: string;
  disabled?: boolean;
  onSelect: (ticket: TicketSummary) => void;
};

export function TicketPicker({ tickets, selected, disabled = false, onSelect }: TicketPickerProps) {
  const answered = disabled || selected !== undefined;

  return (
    <div
      role="group"
      aria-label="Seus chamados"
      className="w-full overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_#1b24310d,0_6px_18px_#1b24310a] outline outline-ink/9"
    >
      <ul className="divide-y divide-line">
        {tickets.map((ticket) => {
          const isSelected = ticket.code === selected;

          return (
            <li key={ticket.code}>
              <button
                type="button"
                disabled={answered}
                aria-pressed={isSelected}
                onClick={() => onSelect(ticket)}
                className={`flex w-full items-center gap-3 px-3.5 py-3 text-left disabled:cursor-default ${
                  isSelected ? "bg-surface" : "bg-white enabled:hover:bg-surface"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex size-4 shrink-0 items-center justify-center rounded-full ${
                    isSelected ? "bg-primary" : "border border-ink/25"
                  }`}
                >
                  {isSelected && <span className="size-1.5 rounded-full bg-white" />}
                </span>
                <span className="shrink-0 text-[12.5px] text-muted">{ticket.code}</span>
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-ink">{ticket.title}</span>
                <TicketStatusLabel status={ticket.status} tone="muted" className="hidden text-[12.5px] sm:flex" />
                <span className="w-12 shrink-0 text-right text-[12.5px] text-muted">{formatDay(ticket.openedAt)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
