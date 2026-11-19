import { slaTargets } from "../../domain/service-desk/sla.js";
import type { ConversationDetail, DraftView, MessagePart, MessageView, TurnEvent } from "./conversation.types.js";

export type EmployeeDraftView = DraftView & { responseTarget: string };

export type EmployeeMessagePart = Exclude<MessagePart, { type: "draft" }> | { type: "draft"; draft: EmployeeDraftView };

export type EmployeeMessageView = Omit<MessageView, "decision" | "parts"> & {
  parts: EmployeeMessagePart[];
  steps: string[];
};

export type EmployeeConversationDetail = Omit<ConversationDetail, "messages" | "cost"> & {
  messages: EmployeeMessageView[];
};

export type EmployeeTurnEvent = Exclude<TurnEvent, { type: "message" }> | { type: "message"; message: EmployeeMessageView };

function employeePart(part: MessagePart): EmployeeMessagePart {
  return part.type === "draft"
    ? { type: "draft", draft: { ...part.draft, responseTarget: slaTargets[part.draft.priority].label } }
    : part;
}

export function employeeMessage({ decision, parts, ...message }: MessageView): EmployeeMessageView {
  return {
    ...message,
    parts: parts.map(employeePart),
    steps: (decision?.steps ?? []).filter((step) => step.ok).map((step) => step.label),
  };
}

export function employeeConversation({ messages, cost: _cost, ...conversation }: ConversationDetail): EmployeeConversationDetail {
  return { ...conversation, messages: messages.map(employeeMessage) };
}

export function employeeEvent(event: TurnEvent): EmployeeTurnEvent {
  return event.type === "message" ? { type: "message", message: employeeMessage(event.message) } : event;
}
