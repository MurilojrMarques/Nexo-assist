import { Prisma } from "../../generated/prisma/client.js";
import { confidenceBand } from "../../domain/conversation/conversation-rules.js";
import type { Database } from "../../infra/database/prisma-client.js";
import type {
  ConversationEventView,
  ConversationRecord,
  ConversationStore,
  DecisionStep,
  DraftRecord,
  DraftStatus,
  HistoryMessage,
  MessagePart,
  MessageView,
  NewDraft,
  NewMessage,
  StatusChange,
  SupportFilter,
} from "./conversation.types.js";

const conversationInclude = {
  employee: { select: { name: true, department: true } },
  assignedAnalyst: { select: { name: true } },
  messages: { select: { content: true }, orderBy: { createdAt: "desc" }, take: 1 },
} satisfies Prisma.ConversationInclude;

type ConversationRow = Prisma.ConversationGetPayload<{ include: typeof conversationInclude }>;

const messageInclude = {
  authorUser: { select: { name: true } },
  decision: true,
} satisfies Prisma.MessageInclude;

type MessageRow = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

type DraftRow = Prisma.TicketDraftGetPayload<object>;

const supportFilters: Record<SupportFilter, (analystId: string) => Prisma.ConversationWhereInput> = {
  all: () => ({ status: { not: "CLOSED" } }),
  waiting: () => ({ status: "WAITING_ANALYST" }),
  with_agent: () => ({ status: "WITH_AGENT" }),
  mine: (analystId) => ({ status: "WITH_ANALYST", assignedAnalystId: analystId }),
};

function toRecord(row: ConversationRow): ConversationRecord {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employee.name,
    employeeDepartment: row.employee.department,
    status: row.status,
    assignedAnalystId: row.assignedAnalystId,
    assignedAnalystName: row.assignedAnalyst?.name ?? null,
    focusTicketCode: row.focusTicketCode,
    handoffReason: row.handoffReason,
    handoffSummary: row.handoffSummary,
    messageCount: row.messageCount,
    lastMessageAt: row.lastMessageAt,
    createdAt: row.createdAt,
    preview: row.messages[0]?.content.slice(0, 160) ?? null,
  };
}

function toMessage(row: MessageRow): MessageView {
  const decision = row.decision;

  return {
    id: row.id,
    author: row.author,
    authorName: row.authorUser?.name ?? null,
    content: row.content,
    parts: (row.parts ?? []) as unknown as MessagePart[],
    createdAt: row.createdAt.toISOString(),
    decision: decision
      ? {
          intent: decision.intent,
          understanding: decision.understanding,
          action: decision.action as NonNullable<MessageView["decision"]>["action"],
          confidence: decision.confidence,
          confidenceBand: confidenceBand(decision.confidence),
          rationale: decision.rationale.split("\n").filter(Boolean),
          steps: decision.steps as unknown as DecisionStep[],
          model: decision.model,
          usage: {
            inputTokens: decision.inputTokens,
            outputTokens: decision.outputTokens,
            cacheReadTokens: decision.cacheReadTokens,
            cacheWriteTokens: decision.cacheWriteTokens,
            costUsd: Number(decision.costUsd),
          },
          latencyMs: decision.latencyMs,
        }
      : null,
  };
}

function toDraft(row: DraftRow): DraftRecord {
  return {
    id: row.id,
    number: row.number,
    conversationId: row.conversationId,
    action: row.action,
    status: row.status,
    targetTicketCode: row.targetTicketCode,
    resultTicketCode: row.resultTicketCode,
    type: row.type,
    category: row.category,
    priority: row.priority,
    priorityRule: row.priorityRule,
    affectedScope: row.affectedScope,
    title: row.title,
    description: row.description,
    expiresAt: row.expiresAt,
  };
}

const asJson = (value: unknown) => value as Prisma.InputJsonValue;

export class PrismaConversationStore implements ConversationStore {
  constructor(private readonly db: Database) {}

  async create(employeeId: string, now: Date): Promise<ConversationRecord> {
    const row = await this.db.conversation.create({
      data: { employeeId, lastMessageAt: now, createdAt: now },
      include: conversationInclude,
    });
    return toRecord(row);
  }

  async find(conversationId: string): Promise<ConversationRecord | null> {
    const row = await this.db.conversation.findUnique({ where: { id: conversationId }, include: conversationInclude });
    return row ? toRecord(row) : null;
  }

  async listByEmployee(employeeId: string): Promise<ConversationRecord[]> {
    const rows = await this.db.conversation.findMany({
      where: { employeeId },
      include: conversationInclude,
      orderBy: { lastMessageAt: "desc" },
      take: 50,
    });
    return rows.map(toRecord);
  }

  async listForSupport(filter: SupportFilter, analystId: string): Promise<ConversationRecord[]> {
    const rows = await this.db.conversation.findMany({
      where: supportFilters[filter](analystId),
      include: conversationInclude,
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    });
    return rows.map(toRecord);
  }

  async messages(conversationId: string): Promise<MessageView[]> {
    const rows = await this.db.message.findMany({
      where: { conversationId },
      include: messageInclude,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toMessage);
  }

  async recentMessages(conversationId: string, limit: number): Promise<HistoryMessage[]> {
    const rows = await this.db.message.findMany({
      where: { conversationId },
      select: { author: true, content: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.reverse();
  }

  async events(conversationId: string): Promise<ConversationEventView[]> {
    const rows = await this.db.conversationEvent.findMany({
      where: { conversationId },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      actorName: row.actor?.name ?? null,
      reason: row.reason,
      team: row.team,
      summary: row.summary,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async appendEmployeeMessage(
    conversationId: string,
    employeeId: string,
    content: string,
    limit: number,
    now: Date,
  ): Promise<MessageView | null> {
    return this.db.$transaction(async (tx) => {
      const counted = await tx.conversation.updateMany({
        where: { id: conversationId, employeeId, messageCount: { lt: limit } },
        data: { messageCount: { increment: 1 }, lastMessageAt: now },
      });

      if (counted.count === 0) {
        return null;
      }

      const row = await tx.message.create({
        data: { conversationId, author: "EMPLOYEE", authorId: employeeId, content, parts: asJson([]), createdAt: now },
        include: messageInclude,
      });
      return toMessage(row);
    });
  }

  async appendMessage(message: NewMessage): Promise<MessageView> {
    return this.db.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: message.conversationId,
          author: message.author,
          authorId: message.authorId,
          content: message.content,
          parts: asJson(message.parts),
          createdAt: message.createdAt,
        },
      });

      if (message.decision) {
        const { rationale, steps, usage, ...decision } = message.decision;
        await tx.agentDecision.create({
          data: {
            ...decision,
            ...usage,
            rationale: rationale.join("\n"),
            steps: asJson(steps),
            conversationId: message.conversationId,
            messageId: created.id,
            createdAt: message.createdAt,
          },
        });
      }

      await tx.conversation.update({ where: { id: message.conversationId }, data: { lastMessageAt: message.createdAt } });

      return toMessage(await tx.message.findUniqueOrThrow({ where: { id: created.id }, include: messageInclude }));
    });
  }

  async changeStatus(change: StatusChange): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const data: Prisma.ConversationUncheckedUpdateManyInput = { status: change.to };

      if (change.assignedAnalystId !== undefined) {
        data.assignedAnalystId = change.assignedAnalystId;
      }

      if (change.handoff !== undefined) {
        data.handoffReason = change.handoff?.reason ?? null;
        data.handoffSummary = change.handoff?.summary ?? null;
      }

      if (change.to === "CLOSED") {
        data.closedAt = change.now;
      }

      const updated = await tx.conversation.updateMany({
        where: {
          id: change.conversationId,
          status: { in: change.from },
          ...(change.requireAssignedTo ? { assignedAnalystId: change.requireAssignedTo } : {}),
        },
        data,
      });

      if (updated.count === 0) {
        return false;
      }

      await tx.conversationEvent.create({
        data: {
          conversationId: change.conversationId,
          type: change.event.type,
          actorId: change.event.actorId,
          reason: change.event.reason ?? null,
          team: change.event.team ?? null,
          summary: change.event.summary ?? null,
          createdAt: change.now,
        },
      });
      return true;
    });
  }

  async setFocusTicket(conversationId: string, ticketCode: string): Promise<void> {
    await this.db.conversation.update({ where: { id: conversationId }, data: { focusTicketCode: ticketCode } });
  }

  async createDraft(draft: NewDraft): Promise<DraftRecord> {
    return this.db.$transaction(async (tx) => {
      await tx.ticketDraft.updateMany({
        where: { conversationId: draft.conversationId, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
      return toDraft(await tx.ticketDraft.create({ data: draft }));
    });
  }

  async findDraft(conversationId: string, draftId: string): Promise<DraftRecord | null> {
    const row = await this.db.ticketDraft.findFirst({ where: { id: draftId, conversationId } });
    return row ? toDraft(row) : null;
  }

  async pendingDraft(conversationId: string, now: Date): Promise<DraftRecord | null> {
    const row = await this.db.ticketDraft.findFirst({
      where: { conversationId, status: "PENDING", expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
    });
    return row ? toDraft(row) : null;
  }

  async drafts(conversationId: string): Promise<DraftRecord[]> {
    const rows = await this.db.ticketDraft.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
    return rows.map(toDraft);
  }

  async settleDraft(draftId: string, to: Exclude<DraftStatus, "PENDING">, now: Date, resultTicketCode?: string): Promise<boolean> {
    const updated = await this.db.ticketDraft.updateMany({
      where: { id: draftId, status: "PENDING" },
      data: { status: to, decidedAt: now, ...(resultTicketCode ? { resultTicketCode } : {}) },
    });
    return updated.count === 1;
  }
}
