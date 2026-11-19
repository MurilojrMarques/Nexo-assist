import { describe, expect, it } from "vitest";
import type { ConversationStatus, ConversationSummary } from "@/features/console/types";
import { countByFilter, filterConversations } from "./conversation-filters";

function conversation(id: string, name: string, status: ConversationStatus, extra: Partial<ConversationSummary> = {}) {
  return {
    id,
    employee: { name, department: "TI", online: false },
    status,
    lastActivity: "10:00",
    unread: 0,
    preview: { kind: "message", from: "employee", text: "Olá" },
    ...extra,
  } satisfies ConversationSummary;
}

const conversations: ConversationSummary[] = [
  conversation("1", "Ana Souza", "transferred", { ticketCode: "INC-20311" }),
  conversation("2", "Bruno Tavares", "agent-help"),
  conversation("3", "Diego Ramos", "agent", { preview: { kind: "typing" } }),
  conversation("4", "Fábio Nunes", "resolved", { preview: { kind: "message", from: "employee", text: "Isso resolveu" } }),
  conversation("5", "Rita Alves", "mine"),
];

function ids(list: ConversationSummary[]) {
  return list.map((item) => item.id);
}

describe("conversation-filters", () => {
  it("Para você traz transferidas e pedidos de ajuda do agent", () => {
    expect(ids(filterConversations(conversations, "for-you", ""))).toEqual(["1", "2"]);
  });

  it("Com o agent traz só as que o agent está atendendo", () => {
    expect(ids(filterConversations(conversations, "with-agent", ""))).toEqual(["3"]);
  });

  it("Minhas traz as que o analista assumiu", () => {
    expect(ids(filterConversations(conversations, "mine", ""))).toEqual(["5"]);
  });

  it("busca por nome sem diferenciar acento e maiúscula", () => {
    expect(ids(filterConversations(conversations, "all", "fabio"))).toEqual(["4"]);
  });

  it("busca por código de chamado e pelo texto da última mensagem", () => {
    expect(ids(filterConversations(conversations, "all", "inc-20311"))).toEqual(["1"]);
    expect(ids(filterConversations(conversations, "all", "resolveu"))).toEqual(["4"]);
  });

  it("combina filtro e busca", () => {
    expect(ids(filterConversations(conversations, "for-you", "bruno"))).toEqual(["2"]);
    expect(ids(filterConversations(conversations, "for-you", "diego"))).toEqual([]);
  });

  it("conta as conversas de cada filtro", () => {
    expect(countByFilter(conversations)).toEqual({ all: 5, "for-you": 2, "with-agent": 1, mine: 1 });
  });
});
