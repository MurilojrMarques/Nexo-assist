import type { ApiConversation, ApiConversationSummary, ConversationStatus, TurnEvent } from "@/features/chat/api/conversation-api";
import type { AgentMessage, ChatMessage } from "@/features/chat/types";
import { SESSION_MESSAGE_LIMIT, type SessionUsage } from "./session-usage";
import { ASSISTANT_NAME, toChatMessage } from "./to-chat-message";

export const STREAMING_ID = "streaming";

export type ChatState = {
  conversationId: string | null;
  status: ConversationStatus | null;
  messages: ChatMessage[];
  usage: SessionUsage;
  loading: boolean;
  busy: boolean;
  error: string | null;
};

export type ChatAction =
  | { type: "loaded"; conversation: ApiConversation | null }
  | { type: "load-failed"; message: string }
  | { type: "sent"; localId: string; text: string }
  | { type: "started"; conversation: ApiConversationSummary }
  | { type: "event"; event: TurnEvent }
  | { type: "finished" }
  | { type: "failed"; localId: string; message: string }
  | { type: "replaced"; conversation: ApiConversation }
  | { type: "error"; message: string | null };

export const initialChatState: ChatState = {
  conversationId: null,
  status: null,
  messages: [],
  usage: { used: 0, limit: SESSION_MESSAGE_LIMIT },
  loading: true,
  busy: false,
  error: null,
};

function fromSummary(summary: ApiConversationSummary): Pick<ChatState, "conversationId" | "status" | "usage"> {
  return {
    conversationId: summary.id,
    status: summary.status,
    usage: { used: summary.messagesSent, limit: summary.messageLimit },
  };
}

function withoutStreaming(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((message) => message.id !== STREAMING_ID);
}

function updateStreaming(messages: ChatMessage[], update: (message: AgentMessage) => AgentMessage): ChatMessage[] {
  const current = messages.find((message): message is AgentMessage => message.id === STREAMING_ID && message.role === "agent");
  const streaming = current ?? { id: STREAMING_ID, role: "agent", author: ASSISTANT_NAME, steps: [], parts: [], streaming: true };
  const updated = update(streaming);

  return current ? messages.map((message) => (message.id === STREAMING_ID ? updated : message)) : [...messages, updated];
}

function appendText(message: AgentMessage, delta: string): AgentMessage {
  const [first, ...rest] = message.parts;
  const text = first?.type === "text" ? first.text + delta : delta;

  return { ...message, parts: [{ type: "text", text }, ...(first?.type === "text" ? rest : message.parts)] };
}

function applyEvent(state: ChatState, event: TurnEvent): ChatState {
  switch (event.type) {
    case "message": {
      const message = toChatMessage(event.message);

      if (message.role === "user") {
        const index = state.messages.findLastIndex((item) => item.role === "user" && item.id.startsWith("local-"));
        return index === -1
          ? { ...state, messages: [...state.messages, message] }
          : { ...state, messages: state.messages.map((item, position) => (position === index ? message : item)) };
      }

      return { ...state, messages: [...withoutStreaming(state.messages), message] };
    }
    case "text":
      return { ...state, messages: updateStreaming(state.messages, (message) => appendText(message, event.delta)) };
    case "step":
      return {
        ...state,
        messages: updateStreaming(state.messages, (message) => ({
          ...message,
          steps: message.steps.some((step) => step.id === event.step.id)
            ? message.steps.map((step) => (step.id === event.step.id ? event.step : step))
            : [...message.steps, event.step],
        })),
      };
    case "conversation":
      return { ...state, ...fromSummary(event.conversation) };
    case "error":
      return { ...state, messages: withoutStreaming(state.messages), error: event.message };
  }
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "loaded":
      return action.conversation
        ? {
            ...state,
            ...fromSummary(action.conversation),
            messages: action.conversation.messages.map((message) => toChatMessage(message)),
            loading: false,
          }
        : { ...state, loading: false };
    case "load-failed":
      return { ...state, loading: false, error: action.message };
    case "sent":
      return {
        ...state,
        busy: true,
        error: null,
        messages: [...state.messages, { id: action.localId, role: "user", text: action.text }],
        usage: { ...state.usage, used: state.usage.used + 1 },
      };
    case "started":
      return {
        ...state,
        ...fromSummary(action.conversation),
        messages: state.messages.filter((message) => message.id.startsWith("local-")),
        usage: { used: action.conversation.messagesSent + 1, limit: action.conversation.messageLimit },
      };
    case "event":
      return applyEvent(state, action.event);
    case "finished":
      return { ...state, busy: false, messages: withoutStreaming(state.messages) };
    case "failed": {
      const unsent = state.messages.some((message) => message.id === action.localId);

      return {
        ...state,
        busy: false,
        error: action.message,
        messages: withoutStreaming(state.messages.filter((message) => message.id !== action.localId)),
        usage: unsent ? { ...state.usage, used: Math.max(0, state.usage.used - 1) } : state.usage,
      };
    }
    case "replaced":
      if (state.busy) {
        return state;
      }

      return {
        ...state,
        ...fromSummary(action.conversation),
        messages: action.conversation.messages.map((message) => toChatMessage(message)),
      };
    case "error":
      return { ...state, error: action.message };
  }
}
