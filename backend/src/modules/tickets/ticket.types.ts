export type TicketSummary = {
  code: string;
  type: "INCIDENT" | "REQUEST";
  category: "ACCESS" | "NETWORK_VPN" | "HARDWARE" | "SOFTWARE" | "EMAIL" | "OTHER";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "IN_PROGRESS" | "WAITING_ANALYST" | "APPROVED" | "RESOLVED" | "CLOSED";
  affectedScope: "ONLY_ME" | "TEAM" | "COMPANY" | "UNKNOWN";
  title: string;
  dueAt: Date | null;
  lastActivityAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
};

export interface TicketReader {
  listByRequester(requesterId: string): Promise<TicketSummary[]>;
}
