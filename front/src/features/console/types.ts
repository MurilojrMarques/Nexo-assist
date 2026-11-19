import type { Priority } from "@/features/tickets/priority";
import type { TicketStatus } from "@/features/tickets/types";

export type ConversationStatus = "transferred" | "agent-help" | "agent" | "mine" | "resolved" | "closed";

export type Employee = {
  name: string;
  department: string;
  online: boolean;
};

export type ConversationPreview =
  | { kind: "message"; from: "employee" | "agent" | "analyst"; text: string }
  | { kind: "typing" };

export type ConversationSummary = {
  id: string;
  employee: Employee;
  status: ConversationStatus;
  statusDetail?: string;
  ticketCode?: string;
  agentPausedUntil?: string;
  lastActivity: string;
  unread: number;
  preview: ConversationPreview;
};

export type ConsoleEvent =
  | { type: "transfer"; team: string; time: string }
  | { type: "assume" | "return" | "close"; actor: string; time: string };

export type ConsoleMessage =
  | { id: string; kind: "day"; label: string }
  | { id: string; kind: "event"; event: ConsoleEvent }
  | { id: string; kind: "employee"; text: string; time: string }
  | { id: string; kind: "agent"; text: string; time: string }
  | { id: string; kind: "analyst"; author: string; team: string; text: string; time: string };

export type EmployeeTicket = {
  code: string;
  title: string;
  status: TicketStatus;
  category: string;
  priority: Priority;
  resolvedAt?: string;
};

export type Analyst = {
  name: string;
  email: string;
  team: string;
};
