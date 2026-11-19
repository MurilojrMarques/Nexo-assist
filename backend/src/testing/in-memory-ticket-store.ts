import { formatTicketCode } from "../domain/service-desk/ticket-rules.js";
import type { Ticket, TicketType, TicketUpdateKind } from "../domain/service-desk/types.js";
import {
  IdempotencyKeyTakenError,
  type IdempotencyRecord,
  type NewTicket,
  type TicketChange,
  type TicketStore,
} from "../ticketing/ticket-store.js";

export class InMemoryTicketStore implements TicketStore {
  readonly tickets = new Map<string, Ticket>();
  readonly updates: { code: string; kind: TicketUpdateKind; content?: string }[] = [];
  private readonly keys = new Map<string, IdempotencyRecord & { ticketCode: string }>();
  private readonly sequences: Record<TicketType, number> = { INCIDENT: 20320, REQUEST: 10511 };

  seed(ticket: Ticket): void {
    this.tickets.set(ticket.code, { ...ticket });
  }

  async listByRequester(requesterId: string): Promise<Ticket[]> {
    return [...this.tickets.values()].filter((ticket) => ticket.requesterId === requesterId).map((ticket) => ({ ...ticket }));
  }

  async findByCode(code: string): Promise<Ticket | null> {
    const ticket = this.tickets.get(code);
    return ticket ? { ...ticket } : null;
  }

  async findIdempotency(key: string) {
    return this.keys.get(key) ?? null;
  }

  async create(ticket: NewTicket, idempotency: IdempotencyRecord): Promise<Ticket> {
    this.claim(idempotency, () => {
      this.sequences[ticket.type] += 1;
      return formatTicketCode(ticket.type, this.sequences[ticket.type]);
    });
    const code = this.keys.get(idempotency.key)!.ticketCode;
    const created: Ticket = {
      code,
      type: ticket.type,
      category: ticket.category,
      priority: ticket.priority,
      status: "OPEN",
      affectedScope: ticket.affectedScope,
      title: ticket.title,
      description: ticket.description,
      requesterId: ticket.requesterId,
      dueAt: ticket.dueAt,
      lastActivityAt: ticket.now,
      resolvedAt: null,
      createdAt: ticket.now,
    };
    this.tickets.set(code, created);
    this.updates.push({ code, kind: "CREATED" });
    return { ...created };
  }

  async applyChange(code: string, change: TicketChange, idempotency: IdempotencyRecord): Promise<Ticket> {
    this.claim(idempotency, () => code);
    const ticket = this.tickets.get(code)!;
    const updated: Ticket = {
      ...ticket,
      status: change.status ?? ticket.status,
      resolvedAt: change.resolvedAt === null ? null : ticket.resolvedAt,
      dueAt: change.dueAt ?? ticket.dueAt,
      lastActivityAt: change.lastActivityAt ?? ticket.lastActivityAt,
    };
    this.tickets.set(code, updated);
    this.updates.push({ code, kind: change.update.kind, content: change.update.content });
    return { ...updated };
  }

  private claim(idempotency: IdempotencyRecord, ticketCode: () => string): void {
    if (this.keys.has(idempotency.key)) {
      throw new IdempotencyKeyTakenError();
    }

    this.keys.set(idempotency.key, { ...idempotency, ticketCode: ticketCode() });
  }
}
