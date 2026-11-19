import type { Ticket } from "../domain/service-desk/types.js";
import type { TicketCategory } from "../domain/service-desk/types.js";
import type {
  CreateTicketInput,
  RelatedTickets,
  TicketGateway,
  TicketStatusFilter,
  TicketView,
} from "../modules/tickets/ticket.types.js";
import { ServiceUnavailableError } from "../shared/errors/http-errors.js";
import type { Clock } from "../shared/time/clock.js";
import { TicketService, type TicketView as ServiceTicketView } from "../ticketing/ticket.service.js";
import { InMemoryTicketStore } from "./in-memory-ticket-store.js";

function serialize(ticket: ServiceTicketView): TicketView {
  return {
    ...ticket,
    dueAt: ticket.dueAt?.toISOString() ?? null,
    lastActivityAt: ticket.lastActivityAt.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    createdAt: ticket.createdAt.toISOString(),
  };
}

export class InProcessTicketGateway implements TicketGateway {
  readonly store = new InMemoryTicketStore();
  readonly calls: { operation: string; code?: string; idempotencyKey?: string }[] = [];
  offline = false;
  private readonly service: TicketService;

  constructor(clock: Clock) {
    this.service = new TicketService(this.store, clock);
  }

  seed(ticket: Ticket): void {
    this.store.seed(ticket);
  }

  async listByRequester(requesterId: string, status: TicketStatusFilter = "all"): Promise<TicketView[]> {
    this.ensureOnline();
    return (await this.service.list(requesterId, status)).map(serialize);
  }

  async getForRequester(code: string, requesterId: string): Promise<TicketView> {
    this.ensureOnline();
    return serialize(await this.service.get(code, requesterId));
  }

  async findRelated(requesterId: string, category: TicketCategory): Promise<RelatedTickets> {
    this.ensureOnline();
    const related = await this.service.related(requesterId, category);
    return { open: related.open.map(serialize), reopenable: related.reopenable.map(serialize) };
  }

  async create(input: CreateTicketInput, idempotencyKey: string): Promise<TicketView> {
    this.record("create", undefined, idempotencyKey);
    return serialize(await this.service.create(input, idempotencyKey));
  }

  async addComment(code: string, requesterId: string, comment: string, idempotencyKey: string): Promise<TicketView> {
    this.record("comment", code, idempotencyKey);
    return serialize(await this.service.addComment(code, requesterId, comment, idempotencyKey));
  }

  async reopen(code: string, requesterId: string, reason: string, idempotencyKey: string): Promise<TicketView> {
    this.record("reopen", code, idempotencyKey);
    return serialize(await this.service.reopen(code, requesterId, reason, idempotencyKey));
  }

  async transfer(code: string, requesterId: string, team: string, summary: string, idempotencyKey: string): Promise<TicketView> {
    this.record("transfer", code, idempotencyKey);
    return serialize(await this.service.transfer(code, requesterId, team, summary, idempotencyKey));
  }

  private record(operation: string, code: string | undefined, idempotencyKey: string): void {
    this.ensureOnline();
    this.calls.push({ operation, ...(code ? { code } : {}), idempotencyKey });
  }

  private ensureOnline(): void {
    if (this.offline) {
      throw new ServiceUnavailableError("O sistema de chamados está instável agora.", "TICKET_SERVICE_UNAVAILABLE");
    }
  }
}
