import { beforeEach, describe, expect, it } from "vitest";
import { searchArticles } from "../domain/knowledge/article-search.js";
import type { Ticket } from "../domain/service-desk/types.js";
import { seedArticles } from "../seed/seed-data.js";
import { FakeClock } from "../testing/in-memory-auth.js";
import { InMemoryConversationStore } from "../testing/in-memory-conversation-store.js";
import { InProcessTicketGateway } from "../testing/in-process-ticket-gateway.js";
import { ServiceDeskActions, type NewTicketProposal } from "./service-desk-actions.js";
import { trustedContext } from "./service-desk-tools.js";

const ANA = "0196f6d2-5a7a-7c4a-9d0e-2b1f3c4d5e6f";
const BRUNO = "0196f6d2-5a7a-7c4a-9d0e-2b1f3c4d5e70";
const DAY = 86_400_000;
const NOW = new Date("2026-11-19T13:00:00Z");

function ticket(overrides: Partial<Ticket>): Ticket {
  return {
    code: "INC-20311",
    type: "INCIDENT",
    category: "HARDWARE",
    priority: "MEDIUM",
    status: "WAITING_ANALYST",
    affectedScope: "ONLY_ME",
    title: "Notebook lento",
    description: "Lento desde a atualização.",
    requesterId: ANA,
    dueAt: new Date(NOW.getTime() - 3 * DAY),
    lastActivityAt: new Date(NOW.getTime() - 6 * DAY),
    resolvedAt: null,
    createdAt: new Date(NOW.getTime() - 6 * DAY),
    ...overrides,
  };
}

const vpnProposal: NewTicketProposal = {
  type: "INCIDENT",
  category: "NETWORK_VPN",
  title: "VPN não conecta — erro 809",
  description: "Windows 11, erro 809 desde ontem.",
  affectedScope: "ONLY_ME",
  workStopped: true,
  deadlineToday: false,
  notDuplicateOf: [],
};

describe("ações do agent", () => {
  let tickets: InProcessTicketGateway;
  let store: InMemoryConversationStore;
  let actions: ServiceDeskActions;
  let conversationId: string;
  let ana: { employeeId: string; conversationId: string };

  beforeEach(async () => {
    const clock = new FakeClock(NOW);
    tickets = new InProcessTicketGateway(clock);
    tickets.seed(ticket({}));
    tickets.seed(
      ticket({ code: "INC-20150", category: "ACCESS", status: "RESOLVED", resolvedAt: new Date(NOW.getTime() - 4 * DAY) }),
    );
    tickets.seed(
      ticket({ code: "INC-19877", category: "EMAIL", status: "RESOLVED", resolvedAt: new Date(NOW.getTime() - 78 * DAY) }),
    );
    tickets.seed(ticket({ code: "INC-20320", requesterId: BRUNO, category: "HARDWARE" }));
    store = new InMemoryConversationStore(new Map());
    actions = new ServiceDeskActions({
      tickets,
      drafts: store,
      clock,
      knowledge: { search: async (query) => searchArticles(seedArticles, query) },
    });
    conversationId = (await store.create(ANA, NOW)).id;
    ana = { employeeId: ANA, conversationId };
  });

  it("calcula a prioridade no código e guarda a regra no rascunho", async () => {
    const outcome = await actions.proposeNewTicket(ana, vpnProposal);

    expect(outcome.part).toMatchObject({ type: "draft", draft: { priority: "HIGH", priorityRule: "Impede uma pessoa de trabalhar" } });
    expect(outcome.rationale).toEqual(["Prioridade Alta: Impede uma pessoa de trabalhar."]);
    expect(tickets.calls).toEqual([]);
  });

  it("equipe parada vira prioridade crítica", async () => {
    const outcome = await actions.proposeNewTicket(ana, { ...vpnProposal, affectedScope: "TEAM" });

    expect(outcome.part).toMatchObject({ draft: { priority: "CRITICAL" } });
  });

  it("não cria rascunho quando há chamado aberto da mesma categoria", async () => {
    const outcome = await actions.proposeNewTicket(ana, { ...vpnProposal, category: "HARDWARE", title: "Notebook travando" });

    expect(outcome.part).toBeUndefined();
    expect(outcome.model).toMatchObject({ draftCreated: false, possibleDuplicates: [expect.objectContaining({ code: "INC-20311" })] });
    expect(store.storedDrafts.size).toBe(0);
  });

  it("aponta o resolvido há até 7 dias como candidato a reabrir", async () => {
    const outcome = await actions.proposeNewTicket(ana, { ...vpnProposal, category: "ACCESS", title: "SAP bloqueado de novo" });

    expect(outcome.rationale?.[0]).toContain("INC-20150 (resolvido há até 7 dias");
  });

  it("cria o rascunho quando o funcionário diz que é outro problema", async () => {
    const outcome = await actions.proposeNewTicket(ana, {
      ...vpnProposal,
      category: "HARDWARE",
      title: "Mouse quebrado",
      notDuplicateOf: ["INC-20311"],
    });

    expect(outcome.part?.type).toBe("draft");
    expect(outcome.rationale).toContain("O funcionário disse que não é o mesmo problema de INC-20311.");
  });

  it("não considera chamados de outra pessoa na duplicidade", async () => {
    const bruno = { employeeId: BRUNO, conversationId };
    const outcome = await actions.proposeNewTicket(bruno, { ...vpnProposal, category: "ACCESS" });

    expect(outcome.part?.type).toBe("draft");
  });

  it("propõe reabrir o resolvido recente e recusa o antigo", async () => {
    const reopen = await actions.proposeTicketUpdate(ana, "INC-20150", "Bloqueou de novo.");
    const old = await actions.proposeTicketUpdate(ana, "INC-19877", "Voltou o problema.");

    expect(reopen.model).toMatchObject({ draftCreated: true, willReopen: true });
    expect(reopen.part).toMatchObject({ draft: { action: "UPDATE", targetTicketCode: "INC-20150" } });
    expect(old.model).toMatchObject({ draftCreated: false });
  });

  it("chamado de outra pessoa é tratado como inexistente", async () => {
    const outcome = await actions.getTicket(ana, "INC-20320");

    expect(outcome.model).toMatchObject({ found: false });
    expect(outcome.part).toBeUndefined();
  });

  it("sinaliza o chamado vencido para a regra de transferência", async () => {
    const outcome = await actions.getTicket(ana, "INC-20311");

    expect(outcome.overdueTicket).toEqual({ code: "INC-20311", priority: "MEDIUM" });
    expect(outcome.focusTicketCode).toBe("INC-20311");
  });

  it("o seletor só mostra chamados do próprio funcionário", async () => {
    const outcome = await actions.askToPickTicket(ana, "Qual deles?", ["INC-20311", "INC-20320"]);

    expect(outcome.part).toMatchObject({ type: "ticket-picker", tickets: [expect.objectContaining({ code: "INC-20311" })] });
    expect(outcome.part && "tickets" in outcome.part ? outcome.part.tickets : []).toHaveLength(1);
  });

  it("com o sistema de chamados fora, devolve um aviso para o modelo em vez de quebrar", async () => {
    tickets.offline = true;

    const outcome = await actions.listMyTickets(ana, "open");

    expect(outcome.model).toMatchObject({ error: expect.stringContaining("instável") });
  });

  it("mostra artigos só quando são relevantes", async () => {
    const vpn = await actions.searchHelpCenter("vpn erro 809");
    const nothing = await actions.searchHelpCenter("receita de bolo de cenoura");

    expect(vpn.part).toMatchObject({ type: "articles", articles: [{ slug: "vpn-erro-809" }] });
    expect(nothing.part).toBeUndefined();
  });

  it("as tools só funcionam com a identidade vinda do servidor", () => {
    expect(() => trustedContext(undefined)).toThrow();
    expect(() => trustedContext({ requestContext: { get: () => undefined } })).toThrow();
    expect(trustedContext({ requestContext: { get: (key) => (key === "employeeId" ? ANA : conversationId) } })).toEqual(ana);
  });
});
