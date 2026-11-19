export const ticketTypes = ["INCIDENT", "REQUEST"] as const;
export const ticketCategories = ["ACCESS", "NETWORK_VPN", "HARDWARE", "SOFTWARE", "EMAIL", "OTHER"] as const;
export const ticketPriorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export const ticketStatuses = ["OPEN", "IN_PROGRESS", "WAITING_ANALYST", "APPROVED", "RESOLVED", "CLOSED"] as const;
export const affectedScopes = ["ONLY_ME", "TEAM", "COMPANY", "UNKNOWN"] as const;

export type TicketType = (typeof ticketTypes)[number];
export type TicketCategory = (typeof ticketCategories)[number];
export type TicketPriority = (typeof ticketPriorities)[number];
export type TicketStatus = (typeof ticketStatuses)[number];
export type AffectedScope = (typeof affectedScopes)[number];
export type TicketUpdateKind = "CREATED" | "COMMENT" | "STATUS_CHANGED" | "PRIORITY_CHANGED" | "REOPENED" | "TRANSFERRED";

export type Ticket = {
  code: string;
  type: TicketType;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  affectedScope: AffectedScope;
  title: string;
  description: string;
  requesterId: string;
  dueAt: Date | null;
  lastActivityAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
};
