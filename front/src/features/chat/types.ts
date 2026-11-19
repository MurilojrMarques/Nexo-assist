import type { Priority } from "@/features/tickets/priority";
import type { TicketDetails, TicketSummary } from "@/features/tickets/types";

export type QuickReplyOption = {
  value: string;
  label: string;
};

export type ReplyOptions = {
  prompt?: string;
  options: QuickReplyOption[];
  selected?: string;
};

export type TicketDraft = {
  code: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  responseDue: string;
  affected: string;
};

export type AgentPart =
  | { type: "text"; text: string; replies?: ReplyOptions }
  | { type: "ticket-picker"; tickets: TicketSummary[]; selected?: string }
  | { type: "ticket-details"; ticket: TicketDetails }
  | { type: "ticket-draft"; draft: TicketDraft };

export type UserMessage = {
  id: string;
  role: "user";
  text: string;
};

export type AgentMessage = {
  id: string;
  role: "agent";
  steps: string[];
  parts: AgentPart[];
};

export type ChatMessage = UserMessage | AgentMessage;
