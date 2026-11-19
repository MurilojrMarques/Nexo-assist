import { describe, expect, it } from "vitest";
import type { ApiMessage, ApiTicket } from "@/features/chat/api/conversation-api";
import { hideRepeatedArticles, toChatMessage } from "./to-chat-message";

const now = new Date("2026-11-19T15:00:00Z");

const ticket: ApiTicket = {
  code: "INC-20311",
  category: "HARDWARE",
  priority: "MEDIUM",
  status: "WAITING_ANALYST",
  title: "Notebook lento",
  description: "Lentidão desde a atualização.",
  lastActivityAt: "2026-11-14T15:00:00Z",
  createdAt: "2026-11-10T12:00:00Z",
  overdue: true,
};

function agentMessage(overrides: Partial<ApiMessage>): ApiMessage {
  return {
    id: "m1",
    author: "AGENT",
    authorName: null,
    content: "",
    parts: [],
    steps: [],
    createdAt: "2026-11-19T15:00:00Z",
    ...overrides,
  };
}

describe("toChatMessage", () => {
  it("põe as respostas rápidas dentro do balão de texto", () => {
    const message = toChatMessage(
      agentMessage({ content: "Quem está sendo afetado?", parts: [{ type: "quick-replies", options: ["Só eu", "Minha equipe"] }] }),
      now,
    );

    expect(message).toMatchObject({
      role: "agent",
      author: "Nexo Assist",
      parts: [
        {
          type: "text",
          text: "Quem está sendo afetado?",
          replies: { options: [{ value: "Só eu", label: "Só eu" }, { value: "Minha equipe", label: "Minha equipe" }] },
        },
      ],
    });
  });

  it("mostra um chamado como card de detalhes e vários como lista", () => {
    const single = toChatMessage(agentMessage({ parts: [{ type: "tickets", tickets: [ticket] }] }), now);
    const many = toChatMessage(agentMessage({ parts: [{ type: "tickets", tickets: [ticket, { ...ticket, code: "REQ-1" }] }] }), now);

    expect(single).toMatchObject({
      parts: [
        {
          type: "ticket-details",
          ticket: {
            code: "INC-20311",
            status: "Aguardando analista",
            category: "Hardware",
            priority: "Média",
            lastUpdate: { relative: "há 5 dias", overdue: true },
          },
        },
      ],
    });
    expect(many).toMatchObject({ parts: [{ type: "ticket-list" }] });
  });

  it("traduz o rascunho para os rótulos da tela", () => {
    const message = toChatMessage(
      agentMessage({
        content: "Confira antes de eu criar.",
        parts: [
          {
            type: "draft",
            draft: {
              id: "d1",
              number: 2,
              action: "CREATE",
              status: "CONFIRMED",
              targetTicketCode: null,
              resultTicketCode: "INC-20321",
              category: "NETWORK_VPN",
              priority: "HIGH",
              affectedScope: "ONLY_ME",
              title: "VPN não conecta",
              description: "Erro 809.",
              responseTarget: "4 horas úteis",
            },
          },
        ],
      }),
      now,
    );

    expect(message).toMatchObject({
      parts: [
        { type: "text" },
        {
          type: "ticket-draft",
          draft: { status: "confirmed", category: "Rede e VPN", priority: "Alta", affected: "Somente você", resultTicketCode: "INC-20321" },
        },
      ],
    });
  });

  it("usa a pergunta do seletor quando não há texto e mostra o nome do analista", () => {
    const picker = toChatMessage(
      agentMessage({ parts: [{ type: "ticket-picker", question: "Qual deles?", tickets: [ticket] }] }),
      now,
    );
    const analyst = toChatMessage(agentMessage({ author: "ANALYST", authorName: "Rafael Lima", content: "Assumi seu caso." }), now);

    expect(picker).toMatchObject({ parts: [{ type: "text", text: "Qual deles?" }, { type: "ticket-picker" }] });
    expect(analyst).toMatchObject({ author: "Rafael Lima" });
  });

  it("marca os passos registrados como concluídos", () => {
    const message = toChatMessage(agentMessage({ content: "Oi", steps: ["buscou na central de ajuda"] }), now);

    expect(message).toMatchObject({ steps: [{ label: "buscou na central de ajuda", status: "ok" }] });
  });
});

describe("hideRepeatedArticles", () => {
  it("mostra cada artigo da central só na primeira vez", () => {
    const article = { type: "articles" as const, articles: [{ slug: "vpn-erro-809", title: "VPN com erro 809" }] };
    const messages = hideRepeatedArticles([
      { id: "a1", role: "agent", author: "Nexo Assist", steps: [], parts: [{ type: "text", text: "Qual Windows?" }, article] },
      { id: "u1", role: "user", text: "Windows 11" },
      { id: "a2", role: "agent", author: "Nexo Assist", steps: [], parts: [{ type: "text", text: "Exige chamado." }, article] },
    ]);

    expect(messages[0]).toMatchObject({ parts: [{ type: "text" }, { type: "articles" }] });
    expect(messages[2]).toMatchObject({ parts: [{ type: "text", text: "Exige chamado." }] });
  });
});

