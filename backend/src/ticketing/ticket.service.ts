import { createHash } from "node:crypto";
import { computeDueAt } from "../domain/service-desk/sla.js";
import { findRelatedTickets, isClosedStatus, isOverdue, isReopenable } from "../domain/service-desk/ticket-rules.js";
import type {
  AffectedScope,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketType,
} from "../domain/service-desk/types.js";
import type { Clock } from "../shared/time/clock.js";
import { ConflictError, NotFoundError } from "../shared/errors/http-errors.js";
import { IdempotencyKeyTakenError, type TicketChange, type TicketStore } from "./ticket-store.js";

export type TicketView = Omit<Ticket, "requesterId"> & {
  overdue: boolean;
  reopenable: boolean;
};

export type CreateTicketCommand = {
  requesterId: string;
  type: TicketType;
  category: TicketCategory;
  priority: TicketPriority;
  affectedScope: AffectedScope;
  title: string;
  description: string;
};

type Operation = "create" | "comment" | "reopen" | "transfer";

const notFound = () => new NotFoundError("Chamado não encontrado.");

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export class TicketService {
  constructor(
    private readonly store: TicketStore,
    private readonly clock: Clock,
  ) {}

  async list(requesterId: string, status: "open" | "all"): Promise<TicketView[]> {
    const tickets = await this.store.listByRequester(requesterId);
    const visible = status === "open" ? tickets.filter((ticket) => !isClosedStatus(ticket.status)) : tickets;
    return visible.map((ticket) => this.toView(ticket));
  }

  async get(code: string, requesterId: string): Promise<TicketView> {
    return this.toView(await this.ownedTicket(code, requesterId));
  }

  async related(requesterId: string, category: TicketCategory) {
    const tickets = await this.store.listByRequester(requesterId);
    const related = findRelatedTickets(tickets, category, this.clock.now());

    return {
      open: related.open.map((ticket) => this.toView(ticket)),
      reopenable: related.reopenable.map((ticket) => this.toView(ticket)),
    };
  }

  create(command: CreateTicketCommand, idempotencyKey: string): Promise<TicketView> {
    return this.idempotent(idempotencyKey, "create", command, async (idempotency) => {
      const now = this.clock.now();
      const ticket = await this.store.create(
        { ...command, dueAt: computeDueAt(command.priority, now), now },
        idempotency,
      );
      return this.toView(ticket);
    });
  }

  addComment(code: string, requesterId: string, comment: string, idempotencyKey: string): Promise<TicketView> {
    return this.idempotent(idempotencyKey, "comment", { code, requesterId, comment }, async (idempotency) => {
      const ticket = await this.ownedTicket(code, requesterId);

      if (isClosedStatus(ticket.status)) {
        throw new ConflictError("O chamado está encerrado. Reabra antes de complementar.");
      }

      return this.change(ticket, idempotency, { kind: "COMMENT", authorId: requesterId, content: comment });
    });
  }

  reopen(code: string, requesterId: string, reason: string, idempotencyKey: string): Promise<TicketView> {
    return this.idempotent(idempotencyKey, "reopen", { code, requesterId, reason }, async (idempotency) => {
      const ticket = await this.ownedTicket(code, requesterId);

      if (!isReopenable(ticket, this.clock.now())) {
        throw new ConflictError("Só é possível reabrir chamados resolvidos há até 7 dias.");
      }

      return this.change(
        ticket,
        idempotency,
        { kind: "REOPENED", authorId: requesterId, content: reason, fromStatus: ticket.status, toStatus: "OPEN" },
        { status: "OPEN", resolvedAt: null },
        true,
      );
    });
  }

  transfer(code: string, requesterId: string, team: string, summary: string, idempotencyKey: string): Promise<TicketView> {
    return this.idempotent(idempotencyKey, "transfer", { code, requesterId, team, summary }, async (idempotency) => {
      const ticket = await this.ownedTicket(code, requesterId);

      if (isClosedStatus(ticket.status)) {
        throw new ConflictError("Não é possível transferir um chamado encerrado.");
      }

      return this.change(
        ticket,
        idempotency,
        {
          kind: "TRANSFERRED",
          authorId: requesterId,
          content: `${team}: ${summary}`,
          fromStatus: ticket.status,
          toStatus: "WAITING_ANALYST",
        },
        { status: "WAITING_ANALYST" },
      );
    });
  }

  private async change(
    ticket: Ticket,
    idempotency: { key: string; operation: string; requestHash: string },
    update: TicketChange["update"],
    fields: Pick<TicketChange, "status" | "resolvedAt"> = {},
    restartsSla = false,
  ): Promise<TicketView> {
    const now = this.clock.now();
    const sla = restartsSla ? { dueAt: computeDueAt(ticket.priority, now), lastActivityAt: now } : {};
    const changed = await this.store.applyChange(ticket.code, { ...fields, ...sla, now, update }, idempotency);
    return this.toView(changed);
  }

  private async ownedTicket(code: string, requesterId: string): Promise<Ticket> {
    const ticket = await this.store.findByCode(code);

    if (!ticket || ticket.requesterId !== requesterId) {
      throw notFound();
    }

    return ticket;
  }

  private async idempotent(
    key: string,
    operation: Operation,
    payload: unknown,
    execute: (idempotency: { key: string; operation: string; requestHash: string }) => Promise<TicketView>,
  ): Promise<TicketView> {
    const requestHash = hashPayload(payload);
    const replay = await this.replay(key, operation, requestHash);

    if (replay) {
      return replay;
    }

    try {
      return await execute({ key, operation, requestHash });
    } catch (error) {
      if (error instanceof IdempotencyKeyTakenError) {
        const concurrent = await this.replay(key, operation, requestHash);

        if (concurrent) {
          return concurrent;
        }
      }

      throw error;
    }
  }

  private async replay(key: string, operation: Operation, requestHash: string): Promise<TicketView | null> {
    const existing = await this.store.findIdempotency(key);

    if (!existing) {
      return null;
    }

    if (existing.operation !== operation || existing.requestHash !== requestHash) {
      throw new ConflictError("Chave de idempotência reutilizada com outro conteúdo.");
    }

    const ticket = await this.store.findByCode(existing.ticketCode);

    if (!ticket) {
      throw notFound();
    }

    return this.toView(ticket);
  }

  private toView(ticket: Ticket): TicketView {
    const now = this.clock.now();
    const { requesterId: _requesterId, ...rest } = ticket;

    return { ...rest, overdue: isOverdue(ticket, now), reopenable: isReopenable(ticket, now) };
  }
}
