import type { ConfidenceBand, ConversationStatus } from "../../domain/conversation/conversation-rules.js";
import type { ModelUsage } from "../../domain/cost/model-pricing.js";
import type { HandoffReason } from "../../domain/service-desk/handoff.js";
import type { AffectedScope, TicketCategory, TicketPriority, TicketType } from "../../domain/service-desk/types.js";
import type { TicketView } from "../tickets/ticket.types.js";

export type MessageAuthor = "EMPLOYEE" | "AGENT" | "ANALYST";
export type DraftAction = "CREATE" | "UPDATE";
export type DraftStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
export type ConversationEventType = "TRANSFERRED" | "ASSUMED" | "RETURNED_TO_AGENT" | "CLOSED";
export type SupportFilter = "all" | "waiting" | "with_agent" | "mine";

export type DraftView = {
  id: string;
  number: number;
  action: DraftAction;
  status: DraftStatus;
  targetTicketCode: string | null;
  resultTicketCode: string | null;
  type: TicketType;
  category: TicketCategory;
  priority: TicketPriority;
  priorityRule: string | null;
  affectedScope: AffectedScope;
  title: string;
  description: string;
  expiresAt: string;
};

export type MessagePart =
  | { type: "tickets"; tickets: TicketView[] }
  | { type: "ticket-picker"; question: string; tickets: TicketView[] }
  | { type: "draft"; draft: DraftView }
  | { type: "articles"; articles: { slug: string; title: string }[] }
  | { type: "quick-replies"; options: string[] }
  | { type: "handoff"; reason: HandoffReason; reasonLabel: string; team: string; summary: string };

export type DecisionAction =
  | "ANSWERED"
  | "ANSWERED_WITH_ARTICLE"
  | "LISTED_TICKETS"
  | "ASKED_TO_PICK_TICKET"
  | "PROPOSED_DRAFT"
  | "TICKET_CONFIRMED"
  | "DRAFT_CANCELLED"
  | "TRANSFERRED"
  | "OUT_OF_SCOPE";

export type DecisionStep = {
  tool: string;
  label: string;
  ok: boolean;
  durationMs: number;
  detail?: string;
};

export type DecisionRecord = {
  intent: string;
  understanding: string;
  action: DecisionAction;
  confidence: number;
  rationale: string[];
  steps: DecisionStep[];
  model: string;
  usage: ModelUsage;
  latencyMs: number;
};

export type DecisionView = DecisionRecord & { confidenceBand: ConfidenceBand };

export type MessageView = {
  id: string;
  author: MessageAuthor;
  authorName: string | null;
  content: string;
  parts: MessagePart[];
  createdAt: string;
  decision: DecisionView | null;
};

export type ConversationRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeDepartment: string;
  status: ConversationStatus;
  assignedAnalystId: string | null;
  assignedAnalystName: string | null;
  focusTicketCode: string | null;
  handoffReason: HandoffReason | null;
  handoffSummary: string | null;
  messageCount: number;
  lastMessageAt: Date;
  createdAt: Date;
  preview: string | null;
};

export type ConversationSummary = {
  id: string;
  status: ConversationStatus;
  employee: { id: string; name: string; department: string };
  assignedAnalyst: { id: string; name: string } | null;
  focusTicketCode: string | null;
  handoff: { reason: HandoffReason; reasonLabel: string; summary: string | null } | null;
  messagesSent: number;
  messageLimit: number;
  remainingMessages: number;
  lastMessageAt: string;
  createdAt: string;
  preview: string | null;
};

export type ConversationEventView = {
  id: string;
  type: ConversationEventType;
  actorName: string | null;
  reason: HandoffReason | null;
  team: string | null;
  summary: string | null;
  createdAt: string;
};

export type ConversationCost = {
  totalUsd: number;
  modelReplies: number;
  averagePerReplyUsd: number;
  inputTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
};

export type ConversationDetail = ConversationSummary & {
  messages: MessageView[];
  events: ConversationEventView[];
  cost: ConversationCost;
};

export type DraftRecord = Omit<DraftView, "expiresAt"> & { conversationId: string; expiresAt: Date };

export type NewDraft = Omit<DraftRecord, "id" | "number" | "status" | "resultTicketCode">;

export type NewMessage = {
  conversationId: string;
  author: Exclude<MessageAuthor, "EMPLOYEE">;
  authorId: string | null;
  content: string;
  parts: MessagePart[];
  decision?: DecisionRecord;
  createdAt: Date;
};

export type StatusChange = {
  conversationId: string;
  from: ConversationStatus[];
  to: ConversationStatus;
  now: Date;
  requireAssignedTo?: string;
  assignedAnalystId?: string | null;
  handoff?: { reason: HandoffReason; summary: string } | null;
  event: {
    type: ConversationEventType;
    actorId: string | null;
    reason?: HandoffReason;
    team?: string;
    summary?: string;
  };
};

export interface ConversationStore {
  create(employeeId: string, now: Date): Promise<ConversationRecord>;
  find(conversationId: string): Promise<ConversationRecord | null>;
  listByEmployee(employeeId: string): Promise<ConversationRecord[]>;
  listForSupport(filter: SupportFilter, analystId: string): Promise<ConversationRecord[]>;
  messages(conversationId: string): Promise<MessageView[]>;
  recentMessages(conversationId: string, limit: number): Promise<HistoryMessage[]>;
  events(conversationId: string): Promise<ConversationEventView[]>;
  appendEmployeeMessage(conversationId: string, employeeId: string, content: string, limit: number, now: Date): Promise<MessageView | null>;
  appendMessage(message: NewMessage): Promise<MessageView>;
  changeStatus(change: StatusChange): Promise<boolean>;
  setFocusTicket(conversationId: string, ticketCode: string): Promise<void>;
  createDraft(draft: NewDraft): Promise<DraftRecord>;
  findDraft(conversationId: string, draftId: string): Promise<DraftRecord | null>;
  pendingDraft(conversationId: string, now: Date): Promise<DraftRecord | null>;
  drafts(conversationId: string): Promise<DraftRecord[]>;
  settleDraft(draftId: string, to: Exclude<DraftStatus, "PENDING">, now: Date, resultTicketCode?: string): Promise<boolean>;
}

export type HistoryMessage = { author: MessageAuthor; content: string };

export const outOfScopeAreas = ["HR", "FINANCE", "FACILITIES", "OTHER"] as const;

export type OutOfScopeArea = (typeof outOfScopeAreas)[number];

export const triageIntents = [
  "GREETING",
  "HOW_TO_QUESTION",
  "REPORT_PROBLEM",
  "REQUEST_SOMETHING",
  "TICKET_STATUS",
  "UPDATE_TICKET",
  "CONFIRM_DRAFT",
  "CANCEL_DRAFT",
  "TALK_TO_ANALYST",
  "OUT_OF_SCOPE",
  "OTHER",
] as const;

export type TriageIntent = (typeof triageIntents)[number];

export type TriageInput = {
  history: HistoryMessage[];
  pendingDraft: DraftView | null;
};

export type TriageResult = {
  intent: TriageIntent;
  understanding: string;
  itScope: boolean;
  confidence: number;
  employeeAskedForAnalyst: boolean;
  caseSummary: string;
  outOfScopeArea: OutOfScopeArea | null;
  usage: ModelUsage;
  model: string;
};

export type TurnContext = {
  conversationId: string;
  employeeId: string;
  employeeName: string;
  history: HistoryMessage[];
  triage: TriageResult;
  focusTicketCode: string | null;
};

export type AgentEvent =
  | { type: "text"; delta: string }
  | { type: "step"; step: { id: string; label: string; status: "running" | "ok" | "error" } };

export type AgentReply = {
  text: string;
  parts: MessagePart[];
  steps: DecisionStep[];
  action: DecisionAction;
  rationale: string[];
  focusTicketCode: string | null;
  overdueTicket: { code: string; priority: TicketPriority } | null;
  usage: ModelUsage;
  model: string;
};

export interface ServiceDeskAgent {
  triage(input: TriageInput): Promise<TriageResult>;
  reply(context: TurnContext, emit: (event: AgentEvent) => void): Promise<AgentReply>;
}

export type TurnEvent =
  | { type: "message"; message: MessageView }
  | { type: "conversation"; conversation: ConversationSummary }
  | AgentEvent
  | { type: "error"; code: string; message: string };

export type TurnSink = (event: TurnEvent) => void;
