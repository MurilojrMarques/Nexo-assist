import type { Ticket, TicketCategory, TicketStatus, TicketType } from "./types.js";

export const REOPEN_WINDOW_DAYS = 7;

const DAY_MS = 86_400_000;

export function isClosedStatus(status: TicketStatus): boolean {
  return status === "RESOLVED" || status === "CLOSED";
}

export function isOverdue(ticket: Pick<Ticket, "status" | "dueAt">, now: Date): boolean {
  return !isClosedStatus(ticket.status) && ticket.dueAt !== null && ticket.dueAt < now;
}

export function isReopenable(ticket: Pick<Ticket, "status" | "resolvedAt">, now: Date): boolean {
  return (
    ticket.status === "RESOLVED" &&
    ticket.resolvedAt !== null &&
    now.getTime() - ticket.resolvedAt.getTime() <= REOPEN_WINDOW_DAYS * DAY_MS
  );
}

export type RelatedTickets<T> = {
  open: T[];
  reopenable: T[];
};

export function findRelatedTickets<T extends Pick<Ticket, "category" | "status" | "resolvedAt">>(
  tickets: T[],
  category: TicketCategory,
  now: Date,
): RelatedTickets<T> {
  const sameCategory = tickets.filter((ticket) => ticket.category === category);

  return {
    open: sameCategory.filter((ticket) => !isClosedStatus(ticket.status)),
    reopenable: sameCategory.filter((ticket) => isReopenable(ticket, now)),
  };
}

export function formatTicketCode(type: TicketType, sequence: number): string {
  return `${type === "INCIDENT" ? "INC" : "REQ"}-${String(sequence).padStart(5, "0")}`;
}
