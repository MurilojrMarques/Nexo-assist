import { beforeEach, describe, expect, it } from "vitest";
import { draftExpiresAt } from "../../domain/conversation/conversation-rules.js";
import type { Ticket } from "../../domain/service-desk/types.js";
import { createLogger } from "../../infra/logging/logger.js";
import { calmTriage, FakeServiceDeskAgent, plainReply } from "../../testing/fake-service-desk-agent.js";
import { FakeClock } from "../../testing/in-memory-auth.js";
import { InMemoryConversationStore } from "../../testing/in-memory-conversation-store.js";
import { InProcessTicketGateway } from "../../testing/in-process-ticket-gateway.js";
import { ConversationService } from "./conversation.service.js";
import type { NewDraft, TurnEvent } from "./conversation.types.js";

const ANA = "0196f6d2-5a7a-7c4a-9d0e-2b1f3c4d5e6f";
const BRUNO = "0196f6d2-5a7a-7c4a-9d0e-2b1f3c4d5e70";
const RAFAEL = "0196f6d2-5a7a-7c4a-9d0e-2b1f3c4d5e71";
const JULIANA = "0196f6d2-5a7a-7c4a-9d0e-2b1f3c4d5e72";
const DAY = 86_400_000;
const NOW = new Date("2026-11-19T13:00:00Z");

const people = new Map([
  [ANA, { name: "Ana Souza", department: "Financeiro" }],
  [BRUNO, { name: "Bruno Tavares", department: "Logística" }],
  [RAFAEL, { name: "Rafael Lima", department: "TI" }],
  [JULIANA, { name: "Juliana Costa", department: "TI" }],
]);

function ticket(overrides: Partial<Ticket>): Ticket {
  return {
    code: "INC-20311",
    type: "INCIDENT",
    category: "HARDWARE",
    priority: "MEDIUM",
    status: "WAITING_ANALYST",
    affectedScope: "ONLY_ME",
    title: "Notebook lento após atualização do Windows",
    description: "Lento desde a atualização.",
    requesterId: ANA,
    dueAt: new Date(NOW.getTime() - 3 * DAY),
    lastActivityAt: new Date(NOW.getTime() - 6 * DAY),
    resolvedAt: null,
    createdAt: new Date(NOW.getTime() - 6 * DAY),
    ...overrides,
  };
}

describe("ConversationService", () => {
  let clock: FakeClock;
  let store: InMemoryConversationStore;
  let agent: FakeServiceDeskAgent;
  let tickets: InProcessTicketGateway;
  let service: ConversationService;

  beforeEach(() => {
    clock = new FakeClock(NOW);
    store = new InMemoryConversationStore(people);
    agent = new FakeServiceDeskAgent();
    tickets = new InProcessTicketGateway(clock);
    tickets.seed(ticket({}));
    tickets.seed(
      ticket({
        code: "INC-20150",
        category: "ACCESS",
        title: "Senha do SAP bloqueada",
        status: "RESOLVED",
        resolvedAt: new Date(NOW.getTime() - 4 * DAY),
      }),
    );
    service = new ConversationService({ store, agent, tickets, clock, logger: createLogger("silent"), historyWindow: 12 });
  });

  async function send(conversationId: string, content: string, employeeId = ANA): Promise<TurnEvent[]> {
    const events: TurnEvent[] = [];
    await service.sendEmployeeMessage(conversationId, employeeId, content, (event) => events.push(event));
    return events;
  }

  function draftFor(conversationId: string, overrides: Partial<NewDraft> = {}): Promise<{ id: string; number: number }> {
    return store.createDraft({
      conversationId,
      action: "CREATE",
      targetTicketCode: null,
      type: "INCIDENT",
      category: "NETWORK_VPN",
      priority: "HIGH",
      priorityRule: "Impede uma pessoa de trabalhar",
      affectedScope: "ONLY_ME",
      title: "VPN não conecta — erro 809",
      description: "Windows 11, erro 809 desde ontem.",
      expiresAt: draftExpiresAt(NOW),
      ...overrides,
    });
  }

  describe("funcionário", () => {
    it("só enxerga as próprias conversas", async () => {
      const mine = await service.start(ANA);
      await service.start(BRUNO);

      expect((await service.listForEmployee(ANA)).map((item) => item.id)).toEqual([mine.id]);
      await expect(service.getForEmployee(mine.id, BRUNO)).rejects.toMatchObject({ statusCode: 404 });
      await expect(send(mine.id, "oi", BRUNO)).rejects.toMatchObject({ statusCode: 404 });
    });

    it("salva a mensagem, faz a triagem, responde e registra a decisão com o custo somado", async () => {
      const conversation = await service.start(ANA);
      const events = await send(conversation.id, "Meu notebook está muito lento");

      expect(events.map((event) => event.type)).toEqual(["message", "text", "message", "conversation"]);

      const detail = await service.getForEmployee(conversation.id, ANA);
      const reply = detail.messages[1];

      expect(detail.messages.map((message) => message.author)).toEqual(["EMPLOYEE", "AGENT"]);
      expect(reply?.decision).toMatchObject({
        intent: "REPORT_PROBLEM",
        understanding: "Seu notebook está lento.",
        action: "ANSWERED",
        confidenceBand: "HIGH",
        model: "triagem-falsa + agent-falso",
        usage: { inputTokens: 1500, outputTokens: 210, cacheReadTokens: 1200, cacheWriteTokens: 0, costUsd: 0.002142 },
      });
      expect(detail.remainingMessages).toBe(29);
      expect(detail.cost).toEqual({
        totalUsd: 0.002142,
        modelReplies: 1,
        averagePerReplyUsd: 0.002142,
        inputTokens: 1500,
        cacheReadTokens: 1200,
        outputTokens: 210,
      });
    });

    it("responde a saudação inicial pela regra, sem chamar o modelo principal", async () => {
      const conversation = await service.start(ANA);
      agent.nextTriage = { ...calmTriage, intent: "GREETING", understanding: "Você está cumprimentando." };

      await send(conversation.id, "oi");
      const detail = await service.getForEmployee(conversation.id, ANA);
      const reply = detail.messages[1];

      expect(agent.replyContexts).toHaveLength(0);
      expect(reply?.content).toBe("Oi, Ana! Em que posso ajudar com TI hoje?");
      expect(reply?.parts[0]).toMatchObject({ type: "quick-replies" });
      expect(reply?.decision).toMatchObject({ model: "triagem-falsa", usage: calmTriage.usage });
    });

    it("saudação no meio da conversa vai para o agent, que tem o contexto", async () => {
      const conversation = await service.start(ANA);
      await send(conversation.id, "Meu notebook está muito lento");
      agent.nextTriage = { ...calmTriage, intent: "GREETING" };

      await send(conversation.id, "oi, voltei");

      expect(agent.replyContexts).toHaveLength(2);
    });

    it("assunto fora de TI é respondido pela regra de escopo, indicando a área", async () => {
      const conversation = await service.start(ANA);
      agent.nextTriage = { ...calmTriage, intent: "OUT_OF_SCOPE", itScope: false, outOfScopeArea: "HR" };

      await send(conversation.id, "Quando caem minhas férias?");
      const detail = await service.getForEmployee(conversation.id, ANA);

      expect(agent.replyContexts).toHaveLength(0);
      expect(detail.messages[1]?.content).toContain("Fale com o RH");
      expect(detail.messages[1]?.decision?.action).toBe("OUT_OF_SCOPE");
      expect(tickets.calls).toEqual([]);
    });

    it("manda só uma janela do histórico para o modelo", async () => {
      const conversation = await service.start(ANA);
      service = new ConversationService({ store, agent, tickets, clock, logger: createLogger("silent"), historyWindow: 3 });

      await send(conversation.id, "primeira");
      await send(conversation.id, "segunda");

      await send(conversation.id, "terceira");

      expect(agent.replyContexts.at(-1)?.history.map((message) => message.content)).toEqual([
        "segunda",
        plainReply.text,
        "terceira",
      ]);
    });

    it("bloqueia a 31ª mensagem sem chamar o agent", async () => {
      const conversation = await service.start(ANA);
      store.conversations.get(conversation.id)!.messageCount = 30;

      await expect(send(conversation.id, "mais uma")).rejects.toMatchObject({ statusCode: 409, code: "MESSAGE_LIMIT_REACHED" });
      expect(agent.triageInputs).toHaveLength(0);
    });

    it("não deixa duas mensagens da mesma conversa rodarem ao mesmo tempo", async () => {
      const conversation = await service.start(ANA);
      let release: () => void = () => undefined;
      agent.replyWith = () => new Promise((resolve) => (release = () => resolve(plainReply)));

      const first = send(conversation.id, "primeira");
      await new Promise((resolve) => setTimeout(resolve, 0));

      await expect(send(conversation.id, "segunda")).rejects.toMatchObject({ statusCode: 409, code: "TURN_IN_PROGRESS" });
      release();
      await first;
    });

    it("não aceita mensagens em conversa encerrada", async () => {
      const conversation = await service.start(ANA);
      await service.close(conversation.id, RAFAEL);

      await expect(send(conversation.id, "oi")).rejects.toMatchObject({ statusCode: 409, code: "CONVERSATION_CLOSED" });
    });
  });

  describe("transferência para analista (Anexo A)", () => {
    it("transfere quando o funcionário pede, sem chamar o agent, e leva o resumo e o chamado em foco", async () => {
      const conversation = await service.start(ANA);
      await store.setFocusTicket(conversation.id, "INC-20311");
      agent.nextTriage = { ...calmTriage, intent: "TALK_TO_ANALYST", employeeAskedForAnalyst: true, caseSummary: "Lentidão há 6 dias." };

      await send(conversation.id, "quero falar com uma pessoa");

      const detail = await service.getForEmployee(conversation.id, ANA);
      expect(agent.replyContexts).toHaveLength(0);
      expect(detail.status).toBe("WAITING_ANALYST");
      expect(detail.handoff).toMatchObject({ reason: "EMPLOYEE_REQUEST", summary: "Lentidão há 6 dias." });
      expect(detail.events[0]).toMatchObject({ type: "TRANSFERRED", team: "Suporte N1", reason: "EMPLOYEE_REQUEST" });
      expect(detail.messages.at(-1)?.parts[0]).toMatchObject({ type: "handoff", team: "Suporte N1" });
      expect(detail.messages.at(-1)?.decision).toMatchObject({ action: "TRANSFERRED" });
      expect(tickets.calls).toContainEqual(expect.objectContaining({ operation: "transfer", code: "INC-20311" }));
    });

    it("transfere quando a confiança fica abaixo de 60%", async () => {
      const conversation = await service.start(ANA);
      agent.nextTriage = { ...calmTriage, intent: "OTHER", confidence: 0.4 };

      await send(conversation.id, "aquilo de ontem sabe");

      const detail = await service.getForEmployee(conversation.id, ANA);
      expect(detail.handoff?.reason).toBe("LOW_CONFIDENCE");
      expect(detail.messages.at(-1)?.decision?.rationale[0]).toContain("40%");
    });

    it("responde e depois transfere quando o chamado consultado está vencido", async () => {
      const conversation = await service.start(ANA);
      agent.replyWith = () => ({
        ...plainReply,
        text: "O INC-20311 está aguardando analista.",
        focusTicketCode: "INC-20311",
        overdueTicket: { code: "INC-20311", priority: "MEDIUM" },
      });

      await send(conversation.id, "e o meu chamado do notebook?");

      const detail = await service.getForEmployee(conversation.id, ANA);
      expect(detail.messages.map((message) => message.decision?.action)).toEqual([undefined, "ANSWERED", "TRANSFERRED"]);
      expect(detail.handoff?.reason).toBe("OVERDUE_TICKET");
      expect(detail.focusTicketCode).toBe("INC-20311");
    });

    it("com a conversa com analista, o agent fica em silêncio", async () => {
      const conversation = await service.start(ANA);
      await service.assume(conversation.id, RAFAEL);

      const events = await send(conversation.id, "oi, ainda está aí?");

      expect(events.map((event) => event.type)).toEqual(["message", "conversation"]);
      expect(agent.triageInputs).toHaveLength(0);
    });
  });

  describe("rascunho e confirmação", () => {
    it("só cria o chamado na confirmação, com a chave do rascunho, e não duplica se confirmar de novo", async () => {
      const conversation = await service.start(ANA);
      const draft = await draftFor(conversation.id);

      const detail = await service.confirmDraft(conversation.id, ANA, draft.id);
      await service.confirmDraft(conversation.id, ANA, draft.id);

      const creates = tickets.calls.filter((call) => call.operation === "create");
      expect(creates).toEqual([{ operation: "create", idempotencyKey: `draft-${draft.id}` }]);
      expect(detail.messages.at(-1)?.content).toContain("Abri o chamado INC-20321");
      expect(detail.messages.at(-1)?.decision).toMatchObject({ action: "TICKET_CONFIRMED", model: "regras-do-servico", usage: { costUsd: 0 } });
      expect(detail.focusTicketCode).toBe("INC-20321");
    });

    it("mostra o estado atual do rascunho no card", async () => {
      const conversation = await service.start(ANA);
      const draft = await store.createDraft({
        conversationId: conversation.id,
        action: "CREATE",
        targetTicketCode: null,
        type: "INCIDENT",
        category: "NETWORK_VPN",
        priority: "HIGH",
        priorityRule: null,
        affectedScope: "ONLY_ME",
        title: "VPN",
        description: "Erro 809 no Windows 11.",
        expiresAt: draftExpiresAt(NOW),
      });
      await store.appendMessage({
        conversationId: conversation.id,
        author: "AGENT",
        authorId: null,
        content: "Confere o rascunho?",
        parts: [{ type: "draft", draft: { ...draft, expiresAt: draft.expiresAt.toISOString() } } as never],
        createdAt: NOW,
      });

      const detail = await service.confirmDraft(conversation.id, ANA, draft.id);

      expect(detail.messages[0]?.parts[0]).toMatchObject({ type: "draft", draft: { status: "CONFIRMED" } });
    });

    it("confirma pelo texto quando a triagem reconhece o 'sim' para o rascunho pendente", async () => {
      const conversation = await service.start(ANA);
      await draftFor(conversation.id);
      agent.nextTriage = { ...calmTriage, intent: "CONFIRM_DRAFT" };

      await send(conversation.id, "pode abrir");

      expect(agent.replyContexts).toHaveLength(0);
      expect(tickets.calls.map((call) => call.operation)).toEqual(["create"]);
    });

    it("ignora 'confirmar' quando não há rascunho pendente e deixa o agent responder", async () => {
      const conversation = await service.start(ANA);
      agent.nextTriage = { ...calmTriage, intent: "CONFIRM_DRAFT" };

      await send(conversation.id, "pode abrir");

      expect(agent.replyContexts).toHaveLength(1);
      expect(tickets.calls).toEqual([]);
    });

    it("caso crítico: cria o chamado e transfere para o Suporte N2", async () => {
      const conversation = await service.start(BRUNO);
      const draft = await draftFor(conversation.id, {
        priority: "CRITICAL",
        affectedScope: "TEAM",
        title: "Leitores do armazém parados",
        description: "Nenhum leitor do armazém lê etiquetas.",
      });

      const detail = await service.confirmDraft(conversation.id, BRUNO, draft.id);

      expect(detail.status).toBe("WAITING_ANALYST");
      expect(detail.handoff?.reason).toBe("CRITICAL_ISSUE");
      expect(detail.events[0]).toMatchObject({ team: "Suporte N2" });
      expect(tickets.calls.map((call) => call.operation)).toEqual(["create", "transfer"]);
    });

    it("reabre em vez de criar quando o rascunho é de atualização de um resolvido há até 7 dias", async () => {
      const conversation = await service.start(ANA);
      const draft = await draftFor(conversation.id, {
        action: "UPDATE",
        targetTicketCode: "INC-20150",
        category: "ACCESS",
        description: "Bloqueou de novo hoje.",
      });

      const detail = await service.confirmDraft(conversation.id, ANA, draft.id);

      expect(tickets.calls.map((call) => call.operation)).toEqual(["reopen"]);
      expect(detail.messages.at(-1)?.content).toContain("Reabri o chamado INC-20150");
    });

    it("um rascunho novo substitui o pendente, que não pode mais ser confirmado", async () => {
      const conversation = await service.start(ANA);
      const first = await draftFor(conversation.id);
      const second = await draftFor(conversation.id, { title: "VPN não conecta no Windows 11" });

      await expect(service.confirmDraft(conversation.id, ANA, first.id)).rejects.toMatchObject({ code: "DRAFT_NOT_PENDING" });
      await service.confirmDraft(conversation.id, ANA, second.id);
      expect(tickets.calls.map((call) => call.operation)).toEqual(["create"]);
    });

    it("recusa rascunho expirado", async () => {
      const conversation = await service.start(ANA);
      const draft = await draftFor(conversation.id);
      clock.advance(31 * 60_000);

      await expect(service.confirmDraft(conversation.id, ANA, draft.id)).rejects.toMatchObject({ code: "DRAFT_EXPIRED" });
      expect(tickets.calls).toEqual([]);
    });

    it("descarta sem tocar no sistema de chamados", async () => {
      const conversation = await service.start(ANA);
      const draft = await draftFor(conversation.id);

      const detail = await service.cancelDraft(conversation.id, ANA, draft.id);

      expect(tickets.calls).toEqual([]);
      expect(detail.messages.at(-1)?.decision?.action).toBe("DRAFT_CANCELLED");
      await expect(service.confirmDraft(conversation.id, ANA, draft.id)).rejects.toMatchObject({ code: "DRAFT_NOT_PENDING" });
    });

    it("com o sistema de chamados fora, o rascunho continua pendente e a nova tentativa funciona", async () => {
      const conversation = await service.start(ANA);
      const draft = await draftFor(conversation.id);
      tickets.offline = true;

      await expect(service.confirmDraft(conversation.id, ANA, draft.id)).rejects.toMatchObject({ statusCode: 503 });

      tickets.offline = false;
      const detail = await service.confirmDraft(conversation.id, ANA, draft.id);
      expect(detail.focusTicketCode).toBe("INC-20321");
    });

    it("não deixa confirmar rascunho de outra conversa", async () => {
      const mine = await service.start(ANA);
      const other = await service.start(ANA);
      const draft = await draftFor(other.id);

      await expect(service.confirmDraft(mine.id, ANA, draft.id)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("console do analista", () => {
    it("só um analista assume a conversa", async () => {
      const conversation = await service.start(ANA);

      await service.assume(conversation.id, RAFAEL);

      await expect(service.assume(conversation.id, JULIANA)).rejects.toMatchObject({ code: "CONVERSATION_NOT_AVAILABLE" });
    });

    it("só quem assumiu responde e devolve para o agent", async () => {
      const conversation = await service.start(ANA);

      await expect(service.sendAnalystMessage(conversation.id, RAFAEL, "Oi, Ana")).rejects.toMatchObject({
        code: "CONVERSATION_NOT_ASSIGNED",
      });

      await service.assume(conversation.id, RAFAEL);
      const message = await service.sendAnalystMessage(conversation.id, RAFAEL, "Oi, Ana. Vou olhar seu notebook.");
      await expect(service.returnToAgent(conversation.id, JULIANA)).rejects.toMatchObject({ code: "CONVERSATION_NOT_ASSIGNED" });
      const returned = await service.returnToAgent(conversation.id, RAFAEL);

      expect(message).toMatchObject({ author: "ANALYST", authorName: "Rafael Lima" });
      expect(returned.status).toBe("WITH_AGENT");
      expect(returned.events.map((event) => event.type)).toEqual(["ASSUMED", "RETURNED_TO_AGENT"]);
    });

    it("filtra a fila por estado e por analista", async () => {
      const waiting = await service.start(ANA);
      const withAgent = await service.start(BRUNO);
      agent.nextTriage = { ...calmTriage, employeeAskedForAnalyst: true };
      await send(waiting.id, "quero um analista");
      const mine = await service.start(ANA);
      await service.assume(mine.id, RAFAEL);

      expect((await service.listForSupport("waiting", RAFAEL)).map((item) => item.id)).toEqual([waiting.id]);
      expect((await service.listForSupport("with_agent", RAFAEL)).map((item) => item.id)).toEqual([withAgent.id]);
      expect((await service.listForSupport("mine", RAFAEL)).map((item) => item.id)).toEqual([mine.id]);
      expect(await service.listForSupport("mine", JULIANA)).toEqual([]);
    });
  });
});
