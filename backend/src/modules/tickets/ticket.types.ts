import type {
  AffectedScope,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketType,
} from "../../domain/service-desk/types.js";

export type TicketView = {
  code: string;
  type: TicketType;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  affectedScope: AffectedScope;
  title: string;
  description: string;
  dueAt: string | null;
  lastActivityAt: string;
  resolvedAt: string | null;
  createdAt: string;
  overdue: boolean;
  reopenable: boolean;
};

export type RelatedTickets = {
  open: TicketView[];
  reopenable: TicketView[];
};

export type CreateTicketInput = {
  requesterId: string;
  type: TicketType;
  category: TicketCategory;
  priority: TicketPriority;
  affectedScope: AffectedScope;
  title: string;
  description: string;
};

export type TicketStatusFilter = "open" | "all";

export interface TicketGateway {
  listByRequester(requesterId: string, status?: TicketStatusFilter): Promise<TicketView[]>;
  getForRequester(code: string, requesterId: string): Promise<TicketView>;
  findRelated(requesterId: string, category: TicketCategory): Promise<RelatedTickets>;
  create(input: CreateTicketInput, idempotencyKey: string): Promise<TicketView>;
  addComment(code: string, requesterId: string, comment: string, idempotencyKey: string): Promise<TicketView>;
  reopen(code: string, requesterId: string, reason: string, idempotencyKey: string): Promise<TicketView>;
  transfer(code: string, requesterId: string, team: string, summary: string, idempotencyKey: string): Promise<TicketView>;
}
