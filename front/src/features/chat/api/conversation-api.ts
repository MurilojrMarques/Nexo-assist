import type { Session } from "@/features/auth/session/session-provider";
import { readServerEvents } from "@/lib/api/sse";
import type {
  ApiAffectedScope,
  ApiTicketCategory,
  ApiTicketPriority,
  ApiTicketStatus,
} from "@/features/tickets/labels";

export type ConversationStatus = "WITH_AGENT" | "WAITING_ANALYST" | "WITH_ANALYST" | "CLOSED";

export type ApiTicket = {
  code: string;
  category: ApiTicketCategory;
  priority: ApiTicketPriority;
  status: ApiTicketStatus;
  title: string;
  description: string;
  lastActivityAt: string;
  createdAt: string;
  overdue: boolean;
};

export type ApiDraft = {
  id: string;
  number: number;
  action: "CREATE" | "UPDATE";
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
  targetTicketCode: string | null;
  resultTicketCode: string | null;
  category: ApiTicketCategory;
  priority: ApiTicketPriority;
  affectedScope: ApiAffectedScope;
  title: string;
  description: string;
  responseTarget: string;
};

export type ApiMessagePart =
  | { type: "tickets"; tickets: ApiTicket[] }
  | { type: "ticket-picker"; question: string; tickets: ApiTicket[] }
  | { type: "draft"; draft: ApiDraft }
  | { type: "articles"; articles: { slug: string; title: string }[] }
  | { type: "quick-replies"; options: string[] }
  | { type: "handoff"; reasonLabel: string; team: string };

export type ApiMessage = {
  id: string;
  author: "EMPLOYEE" | "AGENT" | "ANALYST";
  authorName: string | null;
  content: string;
  parts: ApiMessagePart[];
  steps: string[];
  createdAt: string;
};

export type ApiConversationSummary = {
  id: string;
  status: ConversationStatus;
  messagesSent: number;
  messageLimit: number;
  lastMessageAt: string;
};

export type ApiConversation = ApiConversationSummary & {
  messages: ApiMessage[];
};

export type StepStatus = "running" | "ok" | "error";

export type TurnEvent =
  | { type: "message"; message: ApiMessage }
  | { type: "conversation"; conversation: ApiConversationSummary }
  | { type: "text"; delta: string }
  | { type: "step"; step: { id: string; label: string; status: StepStatus } }
  | { type: "error"; code: string; message: string };

const turnEventTypes = new Set(["message", "conversation", "text", "step", "error"]);

export interface ConversationApi {
  latest(): Promise<ApiConversation | null>;
  get(conversationId: string): Promise<ApiConversation>;
  start(): Promise<ApiConversationSummary>;
  send(conversationId: string, content: string, onEvent: (event: TurnEvent) => void, signal?: AbortSignal): Promise<void>;
  confirmDraft(conversationId: string, draftId: string): Promise<ApiConversation>;
  cancelDraft(conversationId: string, draftId: string): Promise<ApiConversation>;
}

const BASE = "/employee/conversations";

export function createConversationApi(session: Pick<Session, "authorizedRequest" | "authorizedStream">): ConversationApi {
  const get = async (conversationId: string) =>
    (await session.authorizedRequest<{ conversation: ApiConversation }>(`${BASE}/${conversationId}`)).conversation;

  return {
    async latest() {
      const { conversations } = await session.authorizedRequest<{ conversations: ApiConversationSummary[] }>(BASE);
      const open = conversations
        .filter((conversation) => conversation.status !== "CLOSED")
        .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))[0];

      return open ? get(open.id) : null;
    },
    get,
    async start() {
      return (await session.authorizedRequest<{ conversation: ApiConversationSummary }>(BASE, { method: "POST" })).conversation;
    },
    async send(conversationId, content, onEvent, signal) {
      const response = await session.authorizedStream(`${BASE}/${conversationId}/messages`, {
        method: "POST",
        body: { content },
        signal,
      });

      if (!response.body) {
        return;
      }

      for await (const { event, data } of readServerEvents(response.body)) {
        if (turnEventTypes.has(event)) {
          onEvent({ type: event, ...(data as object) } as TurnEvent);
        }
      }
    },
    async confirmDraft(conversationId, draftId) {
      return (
        await session.authorizedRequest<{ conversation: ApiConversation }>(`${BASE}/${conversationId}/drafts/${draftId}/confirm`, {
          method: "POST",
        })
      ).conversation;
    },
    async cancelDraft(conversationId, draftId) {
      return (
        await session.authorizedRequest<{ conversation: ApiConversation }>(`${BASE}/${conversationId}/drafts/${draftId}/cancel`, {
          method: "POST",
        })
      ).conversation;
    },
  };
}
