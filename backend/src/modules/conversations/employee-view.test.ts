import { describe, expect, it } from "vitest";
import { NO_USAGE } from "../../domain/cost/model-pricing.js";
import { employeeMessage } from "./employee-view.js";
import type { DraftView, MessageView } from "./conversation.types.js";

const draft: DraftView = {
  id: "d1",
  number: 3,
  action: "CREATE",
  status: "PENDING",
  targetTicketCode: null,
  resultTicketCode: null,
  type: "INCIDENT",
  category: "NETWORK_VPN",
  priority: "HIGH",
  priorityRule: "Impede de trabalhar",
  affectedScope: "ONLY_ME",
  title: "VPN não conecta",
  description: "Erro 809 desde ontem.",
  expiresAt: "2026-11-19T18:00:00.000Z",
};

const message: MessageView = {
  id: "m1",
  author: "AGENT",
  authorName: null,
  content: "Confira o rascunho.",
  parts: [{ type: "draft", draft }],
  createdAt: "2026-11-19T17:00:00.000Z",
  decision: {
    intent: "REPORT_PROBLEM",
    understanding: "Sua VPN não conecta.",
    action: "PROPOSED_DRAFT",
    confidence: 0.9,
    confidenceBand: "HIGH",
    rationale: ["Impede de trabalhar"],
    steps: [
      { tool: "searchHelpCenter", label: "buscou na central de ajuda", ok: true, durationMs: 10 },
      { tool: "listMyTickets", label: "consultou seus chamados", ok: false, durationMs: 10 },
    ],
    model: "claude-sonnet-5-5",
    usage: NO_USAGE,
    latencyMs: 900,
  },
};

describe("visão do funcionário", () => {
  it("esconde a decisão interna e mantém só os passos concluídos", () => {
    const view = employeeMessage(message);

    expect(view).not.toHaveProperty("decision");
    expect(view.steps).toEqual(["buscou na central de ajuda"]);
  });

  it("informa no rascunho o prazo de resposta da prioridade", () => {
    const view = employeeMessage(message);

    expect(view.parts[0]).toMatchObject({ type: "draft", draft: { responseTarget: "4 horas úteis" } });
  });
});
