import { Prisma } from "../generated/prisma/client.js";
import type { Database } from "../infra/database/prisma-client.js";
import { formatTicketCode } from "../domain/service-desk/ticket-rules.js";
import type { Ticket, TicketType } from "../domain/service-desk/types.js";
import {
  IdempotencyKeyTakenError,
  type IdempotencyRecord,
  type NewTicket,
  type TicketChange,
  type TicketStore,
} from "./ticket-store.js";

const ticketSelect = {
  code: true,
  type: true,
  category: true,
  priority: true,
  status: true,
  affectedScope: true,
  title: true,
  description: true,
  requesterId: true,
  dueAt: true,
  lastActivityAt: true,
  resolvedAt: true,
  createdAt: true,
} as const;

const sequenceStart: Record<TicketType, number> = {
  INCIDENT: 20000,
  REQUEST: 10000,
};

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export class PrismaTicketStore implements TicketStore {
  constructor(private readonly db: Database) {}

  listByRequester(requesterId: string): Promise<Ticket[]> {
    return this.db.ticket.findMany({
      where: { requesterId },
      orderBy: { lastActivityAt: "desc" },
      select: ticketSelect,
    });
  }

  findByCode(code: string): Promise<Ticket | null> {
    return this.db.ticket.findUnique({ where: { code }, select: ticketSelect });
  }

  findIdempotency(key: string) {
    return this.db.ticketIdempotencyKey.findUnique({
      where: { key },
      select: { key: true, operation: true, requestHash: true, ticketCode: true },
    });
  }

  async create(ticket: NewTicket, idempotency: IdempotencyRecord): Promise<Ticket> {
    try {
      return await this.db.$transaction(async (tx) => {
        const { lastNumber } = await tx.ticketSequence.upsert({
          where: { type: ticket.type },
          create: { type: ticket.type, lastNumber: sequenceStart[ticket.type] + 1 },
          update: { lastNumber: { increment: 1 } },
          select: { lastNumber: true },
        });
        const code = formatTicketCode(ticket.type, lastNumber);
        const created = await tx.ticket.create({
          data: {
            code,
            type: ticket.type,
            category: ticket.category,
            priority: ticket.priority,
            affectedScope: ticket.affectedScope,
            title: ticket.title,
            description: ticket.description,
            requesterId: ticket.requesterId,
            dueAt: ticket.dueAt,
            lastActivityAt: ticket.now,
            createdAt: ticket.now,
            updates: { create: { kind: "CREATED", authorId: ticket.requesterId, toStatus: "OPEN", createdAt: ticket.now } },
          },
          select: ticketSelect,
        });
        await tx.ticketIdempotencyKey.create({ data: { ...idempotency, ticketCode: code } });
        return created;
      });
    } catch (error) {
      throw isUniqueViolation(error) ? new IdempotencyKeyTakenError() : error;
    }
  }

  async applyChange(code: string, change: TicketChange, idempotency: IdempotencyRecord): Promise<Ticket> {
    try {
      return await this.db.$transaction(async (tx) => {
        const updated = await tx.ticket.update({
          where: { code },
          data: {
            status: change.status,
            resolvedAt: change.resolvedAt,
            dueAt: change.dueAt,
            lastActivityAt: change.lastActivityAt,
            updates: { create: { ...change.update, createdAt: change.now } },
          },
          select: ticketSelect,
        });
        await tx.ticketIdempotencyKey.create({ data: { ...idempotency, ticketCode: code } });
        return updated;
      });
    } catch (error) {
      throw isUniqueViolation(error) ? new IdempotencyKeyTakenError() : error;
    }
  }
}
