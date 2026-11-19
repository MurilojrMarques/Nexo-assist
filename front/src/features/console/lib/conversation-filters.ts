import type { ConversationSummary } from "@/features/console/types";
import { needsAnalyst } from "./conversation-status";

export type ConversationFilter = "all" | "for-you" | "with-agent" | "mine";

export const conversationFilters: { value: ConversationFilter; label: string; showCount: boolean }[] = [
  { value: "all", label: "Todas", showCount: false },
  { value: "for-you", label: "Para você", showCount: true },
  { value: "with-agent", label: "Com o agent", showCount: true },
  { value: "mine", label: "Minhas", showCount: true },
];

const matchesFilter: Record<ConversationFilter, (conversation: ConversationSummary) => boolean> = {
  all: () => true,
  "for-you": (conversation) => needsAnalyst(conversation.status),
  "with-agent": (conversation) => conversation.status === "agent",
  mine: (conversation) => conversation.status === "mine",
};

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function matchesQuery(conversation: ConversationSummary, query: string): boolean {
  const search = normalize(query.trim());

  if (!search) {
    return true;
  }

  const previewText = conversation.preview.kind === "message" ? conversation.preview.text : "";

  return [conversation.employee.name, conversation.ticketCode ?? "", previewText].some((value) =>
    normalize(value).includes(search),
  );
}

export function filterConversations(
  conversations: ConversationSummary[],
  filter: ConversationFilter,
  query: string,
): ConversationSummary[] {
  return conversations.filter(
    (conversation) => matchesFilter[filter](conversation) && matchesQuery(conversation, query),
  );
}

export function countByFilter(conversations: ConversationSummary[]): Record<ConversationFilter, number> {
  return {
    all: conversations.length,
    "for-you": conversations.filter(matchesFilter["for-you"]).length,
    "with-agent": conversations.filter(matchesFilter["with-agent"]).length,
    mine: conversations.filter(matchesFilter.mine).length,
  };
}
