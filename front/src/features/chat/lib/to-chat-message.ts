import type { ApiDraft, ApiMessage, ApiMessagePart, ApiTicket } from "@/features/chat/api/conversation-api";
import type { AgentPart, ChatMessage, DraftStatus, TicketDraft } from "@/features/chat/types";
import { formatRelative } from "@/features/tickets/format-date";
import { categoryLabels, priorityLabels, scopeLabels, statusLabels } from "@/features/tickets/labels";
import type { TicketDetails, TicketSummary } from "@/features/tickets/types";

export const ASSISTANT_NAME = "Nexo Assist";

const draftStatuses: Record<ApiDraft["status"], DraftStatus> = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
};

export function toTicketSummary(ticket: ApiTicket): TicketSummary {
  return { code: ticket.code, title: ticket.title, status: statusLabels[ticket.status], openedAt: ticket.createdAt };
}

export function toTicketDetails(ticket: ApiTicket, now: Date): TicketDetails {
  return {
    ...toTicketSummary(ticket),
    description: ticket.description,
    category: categoryLabels[ticket.category],
    priority: priorityLabels[ticket.priority],
    lastUpdate: { relative: formatRelative(ticket.lastActivityAt, now), overdue: ticket.overdue },
  };
}

export function toTicketDraft(draft: ApiDraft): TicketDraft {
  return {
    id: draft.id,
    number: draft.number,
    action: draft.action,
    status: draftStatuses[draft.status],
    targetTicketCode: draft.targetTicketCode,
    resultTicketCode: draft.resultTicketCode,
    title: draft.title,
    description: draft.description,
    category: categoryLabels[draft.category],
    priority: priorityLabels[draft.priority],
    responseTarget: draft.responseTarget,
    affected: scopeLabels[draft.affectedScope],
  };
}

function toCardPart(part: Exclude<ApiMessagePart, { type: "quick-replies" }>, now: Date): AgentPart | null {
  switch (part.type) {
    case "tickets":
      if (part.tickets.length === 0) {
        return null;
      }

      return part.tickets.length === 1
        ? { type: "ticket-details", ticket: toTicketDetails(part.tickets[0]!, now) }
        : { type: "ticket-list", tickets: part.tickets.map(toTicketSummary) };
    case "ticket-picker":
      return { type: "ticket-picker", tickets: part.tickets.map(toTicketSummary) };
    case "draft":
      return { type: "ticket-draft", draft: toTicketDraft(part.draft) };
    case "articles":
      return part.articles.length > 0 ? { type: "articles", articles: part.articles } : null;
    case "handoff":
      return { type: "handoff", team: part.team, reason: part.reasonLabel };
  }
}

export function toChatMessage(message: ApiMessage, now: Date = new Date()): ChatMessage {
  if (message.author === "EMPLOYEE") {
    return { id: message.id, role: "user", text: message.content };
  }

  const replies = message.parts.find((part) => part.type === "quick-replies");
  const picker = message.parts.find((part) => part.type === "ticket-picker");
  const text = message.content.trim() || picker?.question || "";
  const parts: AgentPart[] = [];

  if (text) {
    parts.push({
      type: "text",
      text,
      replies: replies?.options.length ? { options: replies.options.map((option) => ({ value: option, label: option })) } : undefined,
    });
  }

  for (const part of message.parts) {
    if (part.type !== "quick-replies") {
      const card = toCardPart(part, now);

      if (card) {
        parts.push(card);
      }
    }
  }

  return {
    id: message.id,
    role: "agent",
    author: message.author === "ANALYST" ? (message.authorName ?? "Analista") : ASSISTANT_NAME,
    steps: message.steps.map((label, index) => ({ id: `${message.id}-${index}`, label, status: "ok" })),
    parts,
  };
}

export function hideRepeatedArticles(messages: ChatMessage[]): ChatMessage[] {
  const shown = new Set<string>();

  return messages.map((message) => {
    if (message.role !== "agent") {
      return message;
    }

    const parts = message.parts.filter((part) => {
      if (part.type !== "articles") {
        return true;
      }

      const fresh = part.articles.some((article) => !shown.has(article.slug));
      part.articles.forEach((article) => shown.add(article.slug));
      return fresh;
    });

    return parts.length === message.parts.length ? message : { ...message, parts };
  });
}
