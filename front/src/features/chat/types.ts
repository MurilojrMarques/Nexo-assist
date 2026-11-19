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

export type DraftStatus = "pending" | "confirmed" | "cancelled" | "expired";

export type TicketDraft = {
  id: string;
  number: number;
  action: "CREATE" | "UPDATE";
  status: DraftStatus;
  targetTicketCode: string | null;
  resultTicketCode: string | null;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  responseTarget: string;
  affected: string;
};

export type HelpArticle = {
  slug: string;
  title: string;
};

export type AgentPart =
  | { type: "text"; text: string; replies?: ReplyOptions }
  | { type: "ticket-picker"; tickets: TicketSummary[]; selected?: string }
  | { type: "ticket-details"; ticket: TicketDetails }
  | { type: "ticket-list"; tickets: TicketSummary[] }
  | { type: "ticket-draft"; draft: TicketDraft }
  | { type: "articles"; articles: HelpArticle[] }
  | { type: "handoff"; team: string; reason: string };

export type StepStatus = "running" | "ok" | "error";

export type AgentStep = {
  id: string;
  label: string;
  status: StepStatus;
};

export type UserMessage = {
  id: string;
  role: "user";
  text: string;
};

export type AgentMessage = {
  id: string;
  role: "agent";
  author: string;
  steps: AgentStep[];
  parts: AgentPart[];
  streaming?: boolean;
};

export type ChatMessage = UserMessage | AgentMessage;
