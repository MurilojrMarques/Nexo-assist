import { ArrowUpRight, ChevronRight, X } from "lucide-react";
import type { ConsoleEvent, ConversationStatus, EmployeeTicket } from "@/features/console/types";
import type { TicketStatus } from "@/features/tickets/types";
import { describeEventOnTicket } from "@/features/console/lib/console-events";
import { formatDay } from "@/features/tickets/format-date";
import { isTicketClosed, ticketStatusStyle } from "@/features/tickets/status";
import { TicketStatusLabel } from "@/features/tickets/components/ticket-status-label";
import { EventIcon } from "./event-icon";

type EmployeeTicketsPanelProps = {
  employeeName: string;
  conversationStatus: ConversationStatus;
  ticketCode?: string;
  tickets: EmployeeTicket[];
  lastEvent?: ConsoleEvent;
  onClose: () => void;
};

export function EmployeeTicketsPanel({
  employeeName,
  conversationStatus,
  ticketCode,
  tickets,
  lastEvent,
  onClose,
}: EmployeeTicketsPanelProps) {
  const firstName = employeeName.split(" ")[0];
  const current = tickets.find((ticket) => ticket.code === ticketCode);
  const others = tickets.filter((ticket) => ticket !== current);
  const closedCount = tickets.filter((ticket) => isTicketClosed(ticket.status)).length;
  const openCount = tickets.length - closedCount;

  return (
    <aside
      aria-label={`Chamados de ${firstName}`}
      className="hidden w-[24.71%] min-w-[280px] shrink-0 flex-col border-l border-line bg-white xl:flex"
    >
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Chamados de {firstName}</h2>
          <p className="text-[12.5px] text-muted">
            {openCount} {openCount === 1 ? "aberto" : "abertos"} · {closedCount}{" "}
            {closedCount === 1 ? "encerrado" : "encerrados"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar chamados"
          className="flex size-8 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
        {current && (
          <section className="flex flex-col gap-2">
            <h3 className="px-1 text-[12.5px] font-medium text-muted">Desta conversa</h3>
            <div className="flex flex-col gap-1 rounded-xl bg-surface p-3.5">
              <div className="flex items-center justify-between gap-2 text-[12.5px]">
                <span className="text-muted">{current.code}</span>
                <TicketStatusLabel status={currentTicketStatus(current.status, conversationStatus)} className="font-medium" />
              </div>
              <p className="text-[15px] font-semibold text-ink">{current.title}</p>
              <p className="text-[12.5px] text-muted">
                {current.category} · prioridade {current.priority.toLowerCase()}
              </p>
              {lastEvent && (
                <p className="mt-2 flex items-center gap-2 border-t border-line pt-2.5 text-[13px] text-ink-soft">
                  <EventIcon type={lastEvent.type} className="size-4 text-muted" />
                  <span className="flex-1">{describeEventOnTicket(lastEvent)}</span>
                  <span className="text-[12px] text-muted">{lastEvent.time}</span>
                </p>
              )}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section className="flex flex-col gap-1">
            <h3 className="px-1 text-[12.5px] font-medium text-muted">Outros chamados</h3>
            <ul className="divide-y divide-line">
              {others.map((ticket) => (
                <li key={ticket.code} className="flex items-center gap-3 px-1 py-3">
                  <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${ticketStatusStyle[ticket.status].dot}`} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[14px] font-medium text-ink">{ticket.title}</span>
                    <span className="truncate text-[12.5px] text-muted">
                      {ticket.code} · {ticket.resolvedAt ? `Resolvido em ${formatDay(ticket.resolvedAt)}` : ticket.status}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
                </li>
              ))}
            </ul>
          </section>
        )}

        {tickets.length === 0 && (
          <p className="px-1 text-[13.5px] text-muted">Nenhum chamado registrado para {firstName}.</p>
        )}
      </div>

      <footer className="border-t border-line p-3">
        <button
          type="button"
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-[13.5px] font-medium text-ink outline outline-ink/12 hover:bg-surface"
        >
          Ver todos os chamados de {firstName}
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </button>
      </footer>
    </aside>
  );
}

function currentTicketStatus(status: TicketStatus, conversationStatus: ConversationStatus): TicketStatus {
  return conversationStatus === "mine" ? "Em atendimento" : status;
}
