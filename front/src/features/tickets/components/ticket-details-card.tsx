import type { TicketDetails } from "@/features/tickets/types";
import { formatDayTime } from "@/features/tickets/format-date";
import { priorityDotClass } from "@/features/tickets/priority";
import { TicketField } from "./ticket-field";
import { TicketStatusLabel } from "./ticket-status-label";

type TicketDetailsCardProps = {
  ticket: TicketDetails;
};

export function TicketDetailsCard({ ticket }: TicketDetailsCardProps) {
  return (
    <section
      aria-label={`Chamado ${ticket.code}`}
      className="flex w-full flex-col gap-1.5 rounded-2xl bg-white px-[18px] pt-4 pb-4 shadow-[0_1px_2px_#1b24310d,0_6px_18px_#1b24310a] outline outline-ink/9"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pb-0.5 text-[12.5px] text-muted">
        <span className="font-medium">Chamado</span>
        <span aria-hidden="true" className="size-[3px] rounded-full bg-line" />
        <span>{ticket.code}</span>
        <TicketStatusLabel status={ticket.status} className="ml-auto font-medium" />
      </div>
      <h3 className="text-lg/[23px] font-semibold tracking-[-0.2px] text-ink">{ticket.title}</h3>
      <p className="text-[13.5px]/5 text-ink-soft">{ticket.description}</p>

      <dl className="mt-2.5 grid gap-x-6 gap-y-3 border-t border-line pt-3 sm:grid-cols-4">
        <TicketField label="Categoria">{ticket.category}</TicketField>
        <TicketField label="Prioridade">
          <span aria-hidden="true" className={`size-1.5 rounded-full ${priorityDotClass[ticket.priority]}`} />
          {ticket.priority}
        </TicketField>
        <TicketField label="Aberto em">{formatDayTime(ticket.openedAt)}</TicketField>
        <TicketField label="Última atualização">
          <span className={ticket.lastUpdate.overdue ? "text-warning-ink" : ""}>{ticket.lastUpdate.relative}</span>
          {ticket.lastUpdate.overdue && (
            <span className="text-[13.5px] font-normal text-muted">· prazo vencido</span>
          )}
        </TicketField>
      </dl>
    </section>
  );
}
