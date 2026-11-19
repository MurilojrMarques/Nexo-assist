import { randomUUID } from "node:crypto";
import { confidenceBand } from "../domain/conversation/conversation-rules.js";
import type {
  ConversationEventView,
  ConversationRecord,
  ConversationStore,
  DecisionRecord,
  DraftRecord,
  DraftStatus,
  HistoryMessage,
  MessageAuthor,
  MessagePart,
  MessageView,
  NewDraft,
  NewMessage,
  StatusChange,
  SupportFilter,
} from "../modules/conversations/conversation.types.js";

type Person = { name: string; department: string };

type StoredMessage = {
  id: string;
  conversationId: string;
  author: MessageAuthor;
  authorId: string | null;
  content: string;
  parts: MessagePart[];
  createdAt: Date;
  decision: DecisionRecord | null;
};

type StoredEvent = Omit<ConversationEventView, "actorName" | "createdAt"> & {
  conversationId: string;
  actorId: string | null;
  createdAt: Date;
};

type StoredConversation = Omit<ConversationRecord, "employeeName" | "employeeDepartment" | "assignedAnalystName" | "preview">;

export class InMemoryConversationStore implements ConversationStore {
  readonly conversations = new Map<string, StoredConversation>();
  readonly storedMessages: StoredMessage[] = [];
  readonly storedEvents: StoredEvent[] = [];
  readonly storedDrafts = new Map<string, DraftRecord>();
  private draftNumber = 380;

  constructor(private readonly people: Map<string, Person>) {}

  async create(employeeId: string, now: Date): Promise<ConversationRecord> {
    const conversation: StoredConversation = {
      id: randomUUID(),
      employeeId,
      status: "WITH_AGENT",
      assignedAnalystId: null,
      focusTicketCode: null,
      handoffReason: null,
      handoffSummary: null,
      messageCount: 0,
      lastMessageAt: now,
      createdAt: now,
    };
    this.conversations.set(conversation.id, conversation);
    return this.record(conversation);
  }

  async find(conversationId: string): Promise<ConversationRecord | null> {
    const conversation = this.conversations.get(conversationId);
    return conversation ? this.record(conversation) : null;
  }

  async listByEmployee(employeeId: string): Promise<ConversationRecord[]> {
    return [...this.conversations.values()]
      .filter((conversation) => conversation.employeeId === employeeId)
      .map((conversation) => this.record(conversation));
  }

  async listForSupport(filter: SupportFilter, analystId: string): Promise<ConversationRecord[]> {
    const matches: Record<SupportFilter, (conversation: StoredConversation) => boolean> = {
      all: (conversation) => conversation.status !== "CLOSED",
      waiting: (conversation) => conversation.status === "WAITING_ANALYST",
      with_agent: (conversation) => conversation.status === "WITH_AGENT",
      mine: (conversation) => conversation.status === "WITH_ANALYST" && conversation.assignedAnalystId === analystId,
    };

    return [...this.conversations.values()].filter(matches[filter]).map((conversation) => this.record(conversation));
  }

  async messages(conversationId: string): Promise<MessageView[]> {
    return this.storedMessages.filter((message) => message.conversationId === conversationId).map((message) => this.view(message));
  }

  async recentMessages(conversationId: string, limit: number): Promise<HistoryMessage[]> {
    return this.storedMessages
      .filter((message) => message.conversationId === conversationId)
      .slice(-limit)
      .map(({ author, content }) => ({ author, content }));
  }

  async events(conversationId: string): Promise<ConversationEventView[]> {
    return this.storedEvents
      .filter((event) => event.conversationId === conversationId)
      .map(({ conversationId: _conversationId, actorId, createdAt, ...event }) => ({
        ...event,
        actorName: actorId ? (this.people.get(actorId)?.name ?? null) : null,
        createdAt: createdAt.toISOString(),
      }));
  }

  async appendEmployeeMessage(
    conversationId: string,
    employeeId: string,
    content: string,
    limit: number,
    now: Date,
  ): Promise<MessageView | null> {
    const conversation = this.conversations.get(conversationId);

    if (!conversation || conversation.employeeId !== employeeId || conversation.messageCount >= limit) {
      return null;
    }

    conversation.messageCount += 1;
    conversation.lastMessageAt = now;
    return this.store({ conversationId, author: "EMPLOYEE", authorId: employeeId, content, parts: [], createdAt: now, decision: null });
  }

  async appendMessage(message: NewMessage): Promise<MessageView> {
    const conversation = this.conversations.get(message.conversationId);

    if (conversation) {
      conversation.lastMessageAt = message.createdAt;
    }

    return this.store({ ...message, decision: message.decision ?? null });
  }

  async changeStatus(change: StatusChange): Promise<boolean> {
    const conversation = this.conversations.get(change.conversationId);

    if (
      !conversation ||
      !change.from.includes(conversation.status) ||
      (change.requireAssignedTo !== undefined && conversation.assignedAnalystId !== change.requireAssignedTo)
    ) {
      return false;
    }

    conversation.status = change.to;

    if (change.assignedAnalystId !== undefined) {
      conversation.assignedAnalystId = change.assignedAnalystId;
    }

    if (change.handoff !== undefined) {
      conversation.handoffReason = change.handoff?.reason ?? null;
      conversation.handoffSummary = change.handoff?.summary ?? null;
    }

    this.storedEvents.push({
      id: randomUUID(),
      conversationId: change.conversationId,
      type: change.event.type,
      actorId: change.event.actorId,
      reason: change.event.reason ?? null,
      team: change.event.team ?? null,
      summary: change.event.summary ?? null,
      createdAt: change.now,
    });
    return true;
  }

  async setFocusTicket(conversationId: string, ticketCode: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);

    if (conversation) {
      conversation.focusTicketCode = ticketCode;
    }
  }

  async createDraft(draft: NewDraft): Promise<DraftRecord> {
    for (const existing of this.storedDrafts.values()) {
      if (existing.conversationId === draft.conversationId && existing.status === "PENDING") {
        existing.status = "EXPIRED";
      }
    }

    this.draftNumber += 1;
    const record: DraftRecord = { ...draft, id: randomUUID(), number: this.draftNumber, status: "PENDING", resultTicketCode: null };
    this.storedDrafts.set(record.id, record);
    return { ...record };
  }

  async findDraft(conversationId: string, draftId: string): Promise<DraftRecord | null> {
    const draft = this.storedDrafts.get(draftId);
    return draft && draft.conversationId === conversationId ? { ...draft } : null;
  }

  async pendingDraft(conversationId: string, now: Date): Promise<DraftRecord | null> {
    const pending = [...this.storedDrafts.values()].filter(
      (draft) => draft.conversationId === conversationId && draft.status === "PENDING" && draft.expiresAt > now,
    );
    const latest = pending.at(-1);
    return latest ? { ...latest } : null;
  }

  async drafts(conversationId: string): Promise<DraftRecord[]> {
    return [...this.storedDrafts.values()].filter((draft) => draft.conversationId === conversationId).map((draft) => ({ ...draft }));
  }

  async settleDraft(draftId: string, to: Exclude<DraftStatus, "PENDING">, _now: Date, resultTicketCode?: string): Promise<boolean> {
    const draft = this.storedDrafts.get(draftId);

    if (!draft || draft.status !== "PENDING") {
      return false;
    }

    draft.status = to;
    draft.resultTicketCode = resultTicketCode ?? draft.resultTicketCode;
    return true;
  }

  private store(message: Omit<StoredMessage, "id">): MessageView {
    const stored = { ...message, id: randomUUID() };
    this.storedMessages.push(stored);
    return this.view(stored);
  }

  private view(message: StoredMessage): MessageView {
    return {
      id: message.id,
      author: message.author,
      authorName: message.authorId ? (this.people.get(message.authorId)?.name ?? null) : null,
      content: message.content,
      parts: message.parts,
      createdAt: message.createdAt.toISOString(),
      decision: message.decision ? { ...message.decision, confidenceBand: confidenceBand(message.decision.confidence) } : null,
    };
  }

  private record(conversation: StoredConversation): ConversationRecord {
    const employee = this.people.get(conversation.employeeId);
    const last = this.storedMessages.filter((message) => message.conversationId === conversation.id).at(-1);

    return {
      ...conversation,
      employeeName: employee?.name ?? "?",
      employeeDepartment: employee?.department ?? "?",
      assignedAnalystName: conversation.assignedAnalystId ? (this.people.get(conversation.assignedAnalystId)?.name ?? null) : null,
      preview: last?.content ?? null,
    };
  }
}
