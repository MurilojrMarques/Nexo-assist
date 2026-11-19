import { randomUUID } from "node:crypto";
import {
  agentAnswers,
  confidenceBand,
  MESSAGE_LIMIT_PER_CONVERSATION,
  reachedMessageLimit,
  remainingMessages,
  teamForHandoff,
} from "../../domain/conversation/conversation-rules.js";
import { addUsage, NO_USAGE } from "../../domain/cost/model-pricing.js";
import { handoffReason, handoffReasonLabels, type HandoffReason } from "../../domain/service-desk/handoff.js";
import { formatLocalDateTime, priorityLabels } from "../../domain/service-desk/labels.js";
import type { TicketPriority } from "../../domain/service-desk/types.js";
import type { Logger } from "../../infra/logging/logger.js";
import { AppError } from "../../shared/errors/app-error.js";
import { NotFoundError } from "../../shared/errors/http-errors.js";
import type { Clock } from "../../shared/time/clock.js";
import type { TicketGateway, TicketView } from "../tickets/ticket.types.js";
import type {
  ConversationCost,
  ConversationDetail,
  ConversationRecord,
  ConversationStore,
  ConversationSummary,
  DecisionRecord,
  DraftRecord,
  DraftView,
  MessagePart,
  MessageView,
  ServiceDeskAgent,
  SupportFilter,
  TriageResult,
  TurnSink,
} from "./conversation.types.js";
import { ruleReply } from "./rule-replies.js";

export type ConversationServiceDependencies = {
  store: ConversationStore;
  agent: ServiceDeskAgent;
  tickets: TicketGateway;
  clock: Clock;
  logger: Logger;
  historyWindow: number;
};

type Handoff = {
  reason: HandoffReason;
  summary: string;
  priority: TicketPriority | null;
  ticketCode: string | null;
  decision: DecisionRecord;
};

const RULE_MODEL = "regras-do-servico";

export function toDraftView(draft: DraftRecord): DraftView {
  const { conversationId: _conversationId, expiresAt, ...rest } = draft;
  return { ...rest, expiresAt: expiresAt.toISOString() };
}

export function toSummary(record: ConversationRecord): ConversationSummary {
  return {
    id: record.id,
    status: record.status,
    employee: { id: record.employeeId, name: record.employeeName, department: record.employeeDepartment },
    assignedAnalyst:
      record.assignedAnalystId && record.assignedAnalystName
        ? { id: record.assignedAnalystId, name: record.assignedAnalystName }
        : null,
    focusTicketCode: record.focusTicketCode,
    handoff: record.handoffReason
      ? { reason: record.handoffReason, reasonLabel: handoffReasonLabels[record.handoffReason], summary: record.handoffSummary }
      : null,
    messagesSent: record.messageCount,
    messageLimit: MESSAGE_LIMIT_PER_CONVERSATION,
    remainingMessages: remainingMessages(record.messageCount),
    lastMessageAt: record.lastMessageAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    preview: record.preview,
  };
}

export function conversationCost(messages: MessageView[]): ConversationCost {
  const decisions = messages.flatMap((message) => (message.decision ? [message.decision] : []));
  const usage = addUsage(...decisions.map((decision) => decision.usage));
  const modelReplies = decisions.filter((decision) => decision.usage.costUsd > 0).length;

  return {
    totalUsd: usage.costUsd,
    modelReplies,
    averagePerReplyUsd: modelReplies ? Math.round((usage.costUsd / modelReplies) * 1_000_000) / 1_000_000 : 0,
    inputTokens: usage.inputTokens,
    cacheReadTokens: usage.cacheReadTokens,
    outputTokens: usage.outputTokens,
  };
}

const conflict = (message: string, code: string) => new AppError(message, 409, code);

export class ConversationService {
  private readonly activeTurns = new Set<string>();

  constructor(private readonly deps: ConversationServiceDependencies) {}

  async start(employeeId: string): Promise<ConversationSummary> {
    return toSummary(await this.deps.store.create(employeeId, this.deps.clock.now()));
  }

  async listForEmployee(employeeId: string): Promise<ConversationSummary[]> {
    return (await this.deps.store.listByEmployee(employeeId)).map(toSummary);
  }

  async getForEmployee(conversationId: string, employeeId: string): Promise<ConversationDetail> {
    return this.detail(await this.owned(conversationId, employeeId));
  }

  async sendEmployeeMessage(conversationId: string, employeeId: string, content: string, emit: TurnSink): Promise<void> {
    const conversation = await this.owned(conversationId, employeeId);
    this.ensureOpen(conversation);

    if (reachedMessageLimit(conversation.messageCount)) {
      throw this.limitReached();
    }

    await this.exclusive(conversationId, async () => {
      const startedAt = this.deps.clock.now();
      const message = await this.deps.store.appendEmployeeMessage(
        conversationId,
        employeeId,
        content,
        MESSAGE_LIMIT_PER_CONVERSATION,
        startedAt,
      );

      if (!message) {
        throw this.limitReached();
      }

      emit({ type: "message", message });

      if (agentAnswers(conversation.status)) {
        await this.agentTurn(conversation, startedAt, emit);
      }

      emit({ type: "conversation", conversation: toSummary(await this.reload(conversationId)) });
    });
  }

  async confirmDraft(conversationId: string, employeeId: string, draftId: string): Promise<ConversationDetail> {
    const conversation = await this.owned(conversationId, employeeId);
    this.ensureOpen(conversation);

    await this.exclusive(conversationId, async () => {
      const draft = await this.ownedDraft(conversationId, draftId);
      const startedAt = this.deps.clock.now();

      await this.confirm(conversation, draft, startedAt, () => undefined, {
        intent: "CONFIRM_DRAFT",
        understanding: `Você confirmou o rascunho #${draft.number} pelo botão.`,
        confidence: 1,
        model: RULE_MODEL,
        usage: NO_USAGE,
      });
    });

    return this.detail(await this.reload(conversationId));
  }

  async cancelDraft(conversationId: string, employeeId: string, draftId: string): Promise<ConversationDetail> {
    const conversation = await this.owned(conversationId, employeeId);
    this.ensureOpen(conversation);

    await this.exclusive(conversationId, async () => {
      const draft = await this.ownedDraft(conversationId, draftId);
      await this.cancel(conversation, draft, this.deps.clock.now(), () => undefined, {
        intent: "CANCEL_DRAFT",
        understanding: `Você descartou o rascunho #${draft.number} pelo botão.`,
        confidence: 1,
        model: RULE_MODEL,
        usage: NO_USAGE,
      });
    });

    return this.detail(await this.reload(conversationId));
  }

  async listForSupport(filter: SupportFilter, analystId: string): Promise<ConversationSummary[]> {
    return (await this.deps.store.listForSupport(filter, analystId)).map(toSummary);
  }

  async getForSupport(conversationId: string): Promise<ConversationDetail> {
    return this.detail(await this.reload(conversationId));
  }

  async assume(conversationId: string, analystId: string): Promise<ConversationDetail> {
    const changed = await this.deps.store.changeStatus({
      conversationId,
      from: ["WAITING_ANALYST", "WITH_AGENT"],
      to: "WITH_ANALYST",
      now: this.deps.clock.now(),
      assignedAnalystId: analystId,
      event: { type: "ASSUMED", actorId: analystId },
    });

    if (!changed) {
      await this.reload(conversationId);
      throw conflict("Essa conversa já está com outro analista ou foi encerrada.", "CONVERSATION_NOT_AVAILABLE");
    }

    return this.detail(await this.reload(conversationId));
  }

  async sendAnalystMessage(conversationId: string, analystId: string, content: string): Promise<MessageView> {
    const conversation = await this.reload(conversationId);

    if (conversation.status !== "WITH_ANALYST" || conversation.assignedAnalystId !== analystId) {
      throw conflict("Assuma a conversa antes de responder.", "CONVERSATION_NOT_ASSIGNED");
    }

    return this.deps.store.appendMessage({
      conversationId,
      author: "ANALYST",
      authorId: analystId,
      content,
      parts: [],
      createdAt: this.deps.clock.now(),
    });
  }

  async returnToAgent(conversationId: string, analystId: string): Promise<ConversationDetail> {
    const changed = await this.deps.store.changeStatus({
      conversationId,
      from: ["WITH_ANALYST"],
      to: "WITH_AGENT",
      now: this.deps.clock.now(),
      requireAssignedTo: analystId,
      assignedAnalystId: null,
      handoff: null,
      event: { type: "RETURNED_TO_AGENT", actorId: analystId },
    });

    if (!changed) {
      await this.reload(conversationId);
      throw conflict("Só o analista que assumiu a conversa pode devolvê-la ao agent.", "CONVERSATION_NOT_ASSIGNED");
    }

    return this.detail(await this.reload(conversationId));
  }

  async close(conversationId: string, analystId: string): Promise<ConversationDetail> {
    const changed = await this.deps.store.changeStatus({
      conversationId,
      from: ["WITH_AGENT", "WAITING_ANALYST", "WITH_ANALYST"],
      to: "CLOSED",
      now: this.deps.clock.now(),
      event: { type: "CLOSED", actorId: analystId },
    });

    if (!changed) {
      await this.reload(conversationId);
      throw conflict("Essa conversa já foi encerrada.", "CONVERSATION_CLOSED");
    }

    return this.detail(await this.reload(conversationId));
  }

  private async agentTurn(conversation: ConversationRecord, startedAt: Date, emit: TurnSink): Promise<void> {
    const { store, agent, historyWindow } = this.deps;
    const history = await store.recentMessages(conversation.id, historyWindow);
    const pending = await store.pendingDraft(conversation.id, startedAt);
    const triage = await agent.triage({ history, pendingDraft: pending ? toDraftView(pending) : null });
    const base = {
      intent: triage.intent,
      understanding: triage.understanding,
      confidence: triage.confidence,
      model: triage.model,
      usage: triage.usage,
    };

    if (pending && triage.intent === "CONFIRM_DRAFT") {
      await this.confirm(conversation, pending, startedAt, emit, base);
      return;
    }

    if (pending && triage.intent === "CANCEL_DRAFT") {
      await this.cancel(conversation, pending, startedAt, emit, base);
      return;
    }

    const reason = handoffReason({
      employeeAskedForAnalyst: triage.employeeAskedForAnalyst,
      priority: null,
      ticketOverdue: false,
      confidence: triage.confidence,
    });

    if (reason) {
      await this.handOff(
        conversation,
        {
          reason,
          summary: triage.caseSummary,
          priority: null,
          ticketCode: null,
          decision: this.decision(base, startedAt, {
            action: "TRANSFERRED",
            rationale: [this.handoffRationale(reason, triage)],
            steps: [],
          }),
        },
        emit,
      );
      return;
    }

    const byRule = ruleReply(triage, { employeeName: conversation.employeeName, firstMessage: conversation.messageCount === 0 });

    if (byRule) {
      const message = await store.appendMessage({
        conversationId: conversation.id,
        author: "AGENT",
        authorId: null,
        content: byRule.content,
        parts: byRule.parts,
        createdAt: this.deps.clock.now(),
        decision: this.decision(base, startedAt, { action: byRule.action, rationale: byRule.rationale, steps: [] }),
      });
      emit({ type: "message", message });
      this.logTurn(conversation.id, message);
      return;
    }

    const reply = await agent.reply(
      {
        conversationId: conversation.id,
        employeeId: conversation.employeeId,
        employeeName: conversation.employeeName,
        history,
        triage,
        focusTicketCode: conversation.focusTicketCode,
      },
      emit,
    );
    const message = await store.appendMessage({
      conversationId: conversation.id,
      author: "AGENT",
      authorId: null,
      content: reply.text,
      parts: reply.parts,
      createdAt: this.deps.clock.now(),
      decision: {
        ...this.decision(base, startedAt, { action: reply.action, rationale: reply.rationale, steps: reply.steps }),
        model: `${triage.model} + ${reply.model}`,
        usage: addUsage(triage.usage, reply.usage),
      },
    });
    emit({ type: "message", message });
    this.logTurn(conversation.id, message);

    if (reply.focusTicketCode && reply.focusTicketCode !== conversation.focusTicketCode) {
      await store.setFocusTicket(conversation.id, reply.focusTicketCode);
    }

    if (reply.overdueTicket) {
      await this.handOff(
        { ...conversation, focusTicketCode: reply.overdueTicket.code },
        {
          reason: "OVERDUE_TICKET",
          summary: triage.caseSummary,
          priority: reply.overdueTicket.priority,
          ticketCode: reply.overdueTicket.code,
          decision: this.decision({ ...base, usage: NO_USAGE, model: RULE_MODEL }, startedAt, {
            action: "TRANSFERRED",
            rationale: [`O chamado ${reply.overdueTicket.code} está com o prazo vencido; a regra manda transferir para um analista.`],
            steps: [],
          }),
        },
        emit,
      );
    }
  }

  private async confirm(
    conversation: ConversationRecord,
    draft: DraftRecord,
    startedAt: Date,
    emit: TurnSink,
    base: Omit<DecisionRecord, "action" | "rationale" | "steps" | "latencyMs">,
  ): Promise<void> {
    const { store } = this.deps;

    if (draft.status === "CONFIRMED") {
      return;
    }

    if (draft.status !== "PENDING") {
      throw conflict("Esse rascunho não está mais aguardando confirmação.", "DRAFT_NOT_PENDING");
    }

    if (draft.expiresAt.getTime() <= startedAt.getTime()) {
      await store.settleDraft(draft.id, "EXPIRED", startedAt);
      throw conflict("Esse rascunho expirou. Me conte de novo o que precisa e eu preparo outro.", "DRAFT_EXPIRED");
    }

    const callStartedAt = Date.now();
    const { ticket, verb } = await this.applyDraft(conversation.employeeId, draft);
    const settled = await store.settleDraft(draft.id, "CONFIRMED", this.deps.clock.now(), ticket.code);

    if (!settled) {
      return;
    }

    await store.setFocusTicket(conversation.id, ticket.code);

    const due = ticket.dueAt ? ` O prazo de resposta vai até ${formatLocalDateTime(ticket.dueAt)}.` : "";
    const message = await store.appendMessage({
      conversationId: conversation.id,
      author: "AGENT",
      authorId: null,
      content: `Pronto! ${verb} o chamado ${ticket.code} com prioridade ${priorityLabels[ticket.priority]}.${due}`,
      parts: [{ type: "tickets", tickets: [ticket] }],
      createdAt: this.deps.clock.now(),
      decision: this.decision(base, startedAt, {
        action: "TICKET_CONFIRMED",
        rationale: [
          "Chamados só são criados ou alterados depois da confirmação do funcionário.",
          ...(draft.priorityRule ? [`Prioridade ${priorityLabels[draft.priority]}: ${draft.priorityRule}.`] : []),
        ],
        steps: [
          {
            tool: draft.action === "CREATE" ? "createTicket" : "updateTicket",
            label: `${verb} o chamado ${ticket.code} no sistema de chamados`,
            ok: true,
            durationMs: Date.now() - callStartedAt,
          },
        ],
      }),
    });
    emit({ type: "message", message });

    if (ticket.priority === "CRITICAL" && conversation.status === "WITH_AGENT") {
      await this.handOff(
        { ...conversation, focusTicketCode: ticket.code },
        {
          reason: "CRITICAL_ISSUE",
          summary: `${ticket.title}. ${draft.description}`.slice(0, 1000),
          priority: ticket.priority,
          ticketCode: ticket.code,
          decision: this.decision({ ...base, usage: NO_USAGE, model: RULE_MODEL }, startedAt, {
            action: "TRANSFERRED",
            rationale: ["Caso crítico: a regra manda transferir para um analista assim que o chamado existe."],
            steps: [],
          }),
        },
        emit,
      );
    }
  }

  private async applyDraft(employeeId: string, draft: DraftRecord): Promise<{ ticket: TicketView; verb: string }> {
    const { tickets } = this.deps;
    const key = `draft-${draft.id}`;

    if (draft.action === "CREATE") {
      const ticket = await tickets.create(
        {
          requesterId: employeeId,
          type: draft.type,
          category: draft.category,
          priority: draft.priority,
          affectedScope: draft.affectedScope,
          title: draft.title,
          description: draft.description,
        },
        key,
      );
      return { ticket, verb: "Abri" };
    }

    if (!draft.targetTicketCode) {
      throw conflict("Esse rascunho não indica qual chamado atualizar.", "DRAFT_INVALID");
    }

    const target = await tickets.getForRequester(draft.targetTicketCode, employeeId);

    if (target.reopenable) {
      return { ticket: await tickets.reopen(target.code, employeeId, draft.description, key), verb: "Reabri" };
    }

    return { ticket: await tickets.addComment(target.code, employeeId, draft.description, key), verb: "Atualizei" };
  }

  private async cancel(
    conversation: ConversationRecord,
    draft: DraftRecord,
    now: Date,
    emit: TurnSink,
    base: Omit<DecisionRecord, "action" | "rationale" | "steps" | "latencyMs">,
  ): Promise<void> {
    if (draft.status === "CANCELLED") {
      return;
    }

    if (!(await this.deps.store.settleDraft(draft.id, "CANCELLED", now))) {
      throw conflict("Esse rascunho não está mais aguardando confirmação.", "DRAFT_NOT_PENDING");
    }

    const message = await this.deps.store.appendMessage({
      conversationId: conversation.id,
      author: "AGENT",
      authorId: null,
      content: `Tudo bem, descartei o rascunho #${draft.number}. Nada foi registrado no sistema de chamados.`,
      parts: [{ type: "quick-replies", options: ["Quero ajustar o rascunho", "Era outra coisa"] }],
      createdAt: this.deps.clock.now(),
      decision: this.decision(base, now, {
        action: "DRAFT_CANCELLED",
        rationale: ["Sem confirmação, nada é criado ou alterado."],
        steps: [],
      }),
    });
    emit({ type: "message", message });
  }

  private async handOff(conversation: ConversationRecord, handoff: Handoff, emit: TurnSink): Promise<void> {
    const { store, tickets, logger } = this.deps;
    const team = teamForHandoff(handoff.reason, handoff.priority);
    const changed = await store.changeStatus({
      conversationId: conversation.id,
      from: ["WITH_AGENT"],
      to: "WAITING_ANALYST",
      now: this.deps.clock.now(),
      handoff: { reason: handoff.reason, summary: handoff.summary },
      event: { type: "TRANSFERRED", actorId: null, reason: handoff.reason, team, summary: handoff.summary },
    });

    if (!changed) {
      return;
    }

    const ticketCode = handoff.ticketCode ?? conversation.focusTicketCode;

    if (ticketCode) {
      await tickets
        .transfer(ticketCode, conversation.employeeId, team, handoff.summary, `transfer-${randomUUID()}`)
        .catch((error: unknown) => logger.warn({ err: error, ticketCode }, "Não consegui transferir o chamado"));
    }

    const part: MessagePart = {
      type: "handoff",
      reason: handoff.reason,
      reasonLabel: handoffReasonLabels[handoff.reason],
      team,
      summary: handoff.summary,
    };
    const message = await store.appendMessage({
      conversationId: conversation.id,
      author: "AGENT",
      authorId: null,
      content: `Vou passar sua conversa para o time ${team}. Um analista continua daqui, já com o resumo do caso. Pode seguir escrevendo por aqui.`,
      parts: [part],
      createdAt: this.deps.clock.now(),
      decision: handoff.decision,
    });
    emit({ type: "message", message });
  }

  private logTurn(conversationId: string, message: MessageView): void {
    const decision = message.decision;

    if (!decision) {
      return;
    }

    this.deps.logger.info(
      {
        conversationId,
        action: decision.action,
        model: decision.model,
        costUsd: decision.usage.costUsd,
        inputTokens: decision.usage.inputTokens,
        cacheReadTokens: decision.usage.cacheReadTokens,
        outputTokens: decision.usage.outputTokens,
        latencyMs: decision.latencyMs,
      },
      "Turno do agent",
    );
  }

  private handoffRationale(reason: HandoffReason, triage: TriageResult): string {
    if (reason === "LOW_CONFIDENCE") {
      return `Confiança de ${Math.round(triage.confidence * 100)}% no entendimento, abaixo do mínimo de 60%: melhor um analista seguir.`;
    }

    return `${handoffReasonLabels[reason]}: a regra manda transferir para um analista.`;
  }

  private decision(
    base: Omit<DecisionRecord, "action" | "rationale" | "steps" | "latencyMs">,
    startedAt: Date,
    outcome: Pick<DecisionRecord, "action" | "rationale" | "steps">,
  ): DecisionRecord {
    return {
      ...base,
      ...outcome,
      latencyMs: Math.max(0, this.deps.clock.now().getTime() - startedAt.getTime()),
    };
  }

  private async detail(conversation: ConversationRecord): Promise<ConversationDetail> {
    const { store } = this.deps;
    const [messages, events, drafts] = await Promise.all([
      store.messages(conversation.id),
      store.events(conversation.id),
      store.drafts(conversation.id),
    ]);
    const currentDrafts = new Map(drafts.map((draft) => [draft.id, toDraftView(draft)]));

    return {
      ...toSummary(conversation),
      cost: conversationCost(messages),
      messages: messages.map((message) => ({
        ...message,
        parts: message.parts.map((part) =>
          part.type === "draft" ? { type: "draft", draft: currentDrafts.get(part.draft.id) ?? part.draft } : part,
        ),
      })),
      events,
    };
  }

  private async exclusive(conversationId: string, work: () => Promise<void>): Promise<void> {
    if (this.activeTurns.has(conversationId)) {
      throw conflict("Ainda estou respondendo a mensagem anterior. Aguarde um instante.", "TURN_IN_PROGRESS");
    }

    this.activeTurns.add(conversationId);

    try {
      await work();
    } finally {
      this.activeTurns.delete(conversationId);
    }
  }

  private async owned(conversationId: string, employeeId: string): Promise<ConversationRecord> {
    const conversation = await this.deps.store.find(conversationId);

    if (!conversation || conversation.employeeId !== employeeId) {
      throw new NotFoundError("Conversa não encontrada.");
    }

    return conversation;
  }

  private async ownedDraft(conversationId: string, draftId: string): Promise<DraftRecord> {
    const draft = await this.deps.store.findDraft(conversationId, draftId);

    if (!draft) {
      throw new NotFoundError("Rascunho não encontrado.");
    }

    return draft;
  }

  private async reload(conversationId: string): Promise<ConversationRecord> {
    const conversation = await this.deps.store.find(conversationId);

    if (!conversation) {
      throw new NotFoundError("Conversa não encontrada.");
    }

    return conversation;
  }

  private ensureOpen(conversation: ConversationRecord): void {
    if (conversation.status === "CLOSED") {
      throw conflict("Essa conversa foi encerrada. Comece uma nova para continuar.", "CONVERSATION_CLOSED");
    }
  }

  private limitReached(): AppError {
    return conflict(
      `Esta conversa chegou ao limite de ${MESSAGE_LIMIT_PER_CONVERSATION} mensagens. Comece uma nova conversa para continuar.`,
      "MESSAGE_LIMIT_REACHED",
    );
  }
}

export function withConfidenceBand<T extends { confidence: number }>(decision: T): T & { confidenceBand: ReturnType<typeof confidenceBand> } {
  return { ...decision, confidenceBand: confidenceBand(decision.confidence) };
}
