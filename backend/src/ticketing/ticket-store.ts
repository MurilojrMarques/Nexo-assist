import type {
  AffectedScope,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketType,
  TicketUpdateKind,
} from "../domain/service-desk/types.js";

export type IdempotencyRecord = {
  key: string;
  operation: string;
  requestHash: string;
};

export type NewTicket = {
  type: TicketType;
  category: TicketCategory;
  priority: TicketPriority;
  affectedScope: AffectedScope;
  title: string;
  description: string;
  requesterId: string;
  dueAt: Date;
  now: Date;
};

export type TicketChange = {
  status?: TicketStatus;
  resolvedAt?: null;
  dueAt?: Date;
  lastActivityAt?: Date;
  now: Date;
  update: {
    kind: TicketUpdateKind;
    authorId: string;
    content?: string;
    fromStatus?: TicketStatus;
    toStatus?: TicketStatus;
  };
};

export interface TicketStore {
  listByRequester(requesterId: string): Promise<Ticket[]>;
  findByCode(code: string): Promise<Ticket | null>;
  findIdempotency(key: string): Promise<(IdempotencyRecord & { ticketCode: string }) | null>;
  create(ticket: NewTicket, idempotency: IdempotencyRecord): Promise<Ticket>;
  applyChange(code: string, change: TicketChange, idempotency: IdempotencyRecord): Promise<Ticket>;
}

export class IdempotencyKeyTakenError extends Error {
  constructor() {
    super("Chave de idempotência já registrada.");
    this.name = "IdempotencyKeyTakenError";
  }
}
