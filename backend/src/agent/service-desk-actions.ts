import { draftExpiresAt } from "../domain/conversation/conversation-rules.js";
import { RELEVANT_ARTICLE_SCORE } from "../domain/knowledge/article-search.js";
import { categoryLabels, priorityLabels, statusLabels } from "../domain/service-desk/labels.js";
import { classifyPriority } from "../domain/service-desk/priority.js";
import type { AffectedScope, TicketCategory, TicketPriority, TicketType } from "../domain/service-desk/types.js";
import { AppError } from "../shared/errors/app-error.js";
import type { Clock } from "../shared/time/clock.js";
import type { ConversationStore, DraftRecord, MessagePart } from "../modules/conversations/conversation.types.js";
import type { KnowledgeBase } from "../modules/knowledge/knowledge.types.js";
import type { TicketGateway, TicketStatusFilter, TicketView } from "../modules/tickets/ticket.types.js";
import { plainText, polish } from "./reply-text.js";

export type TrustedContext = { employeeId: string; conversationId: string };

export type ActionOutcome = {
  model: unknown;
  part?: MessagePart;
  rationale?: string[];
  focusTicketCode?: string;
  overdueTicket?: { code: string; priority: TicketPriority };
  detail: string;
};

export type ServiceDeskActionDependencies = {
  tickets: TicketGateway;
  knowledge: KnowledgeBase;
  drafts: Pick<ConversationStore, "createDraft">;
  clock: Clock;
};

export type NewTicketProposal = {
  type: TicketType;
  category: TicketCategory;
  title: string;
  description: string;
  affectedScope: AffectedScope;
  workStopped: boolean;
  deadlineToday: boolean;
  notDuplicateOf: string[];
};

const MAX_TICKETS_FOR_MODEL = 10;

function ticketForModel(ticket: TicketView) {
  return {
    code: ticket.code,
    title: ticket.title,
    category: categoryLabels[ticket.category],
    priority: priorityLabels[ticket.priority],
    status: statusLabels[ticket.status],
    overdue: ticket.overdue,
    reopenable: ticket.reopenable,
    dueAt: ticket.dueAt,
    lastActivityAt: ticket.lastActivityAt,
    resolvedAt: ticket.resolvedAt,
  };
}

function draftForModel(draft: DraftRecord) {
  return {
    draftNumber: draft.number,
    action: draft.action,
    targetTicketCode: draft.targetTicketCode,
    priority: priorityLabels[draft.priority],
    priorityRule: draft.priorityRule,
    shownToEmployee: true,
    nextStep: "O funcionário precisa confirmar no card. Nada foi registrado ainda.",
  };
}

function toDraftPart(draft: DraftRecord): MessagePart {
  const { conversationId: _conversationId, expiresAt, ...rest } = draft;
  return { type: "draft", draft: { ...rest, expiresAt: expiresAt.toISOString() } };
}

function unavailable(error: unknown): ActionOutcome {
  if (error instanceof AppError && error.statusCode === 503) {
    return {
      model: { error: "O sistema de chamados está instável agora. Peça para o funcionário tentar de novo em alguns segundos." },
      detail: "Sistema de chamados indisponível",
    };
  }

  throw error;
}

function isNotFound(error: unknown): boolean {
  return error instanceof AppError && error.statusCode === 404;
}

export class ServiceDeskActions {
  constructor(private readonly deps: ServiceDeskActionDependencies) {}

  async searchHelpCenter(query: string): Promise<ActionOutcome> {
    const matches = await this.deps.knowledge.search(query);
    const relevant = matches.filter((match) => match.score >= RELEVANT_ARTICLE_SCORE);

    return {
      model: {
        articles: matches.map((match) => ({
          title: match.article.title,
          content: match.article.content,
          relevance: match.score,
          relevant: match.score >= RELEVANT_ARTICLE_SCORE,
        })),
      },
      ...(relevant.length > 0
        ? {
            part: {
              type: "articles",
              articles: relevant.map((match) => ({ slug: match.article.slug, title: match.article.title })),
            },
            rationale: relevant.map(
              (match) => `Artigo "${match.article.title}" com aderência de ${Math.round(match.score * 100)}% à mensagem.`,
            ),
          }
        : {}),
      detail: relevant.length > 0 ? `${relevant.length} artigo(s) relevante(s)` : "Nenhum artigo relevante",
    };
  }

  async listMyTickets(context: TrustedContext, status: TicketStatusFilter): Promise<ActionOutcome> {
    try {
      const tickets = await this.deps.tickets.listByRequester(context.employeeId, status);
      const shown = tickets.slice(0, MAX_TICKETS_FOR_MODEL);

      return {
        model: { total: tickets.length, tickets: shown.map(ticketForModel) },
        ...(shown.length > 0 ? { part: { type: "tickets", tickets: shown } } : {}),
        detail: `${tickets.length} chamado(s) encontrado(s)`,
      };
    } catch (error) {
      return unavailable(error);
    }
  }

  async getTicket(context: TrustedContext, code: string): Promise<ActionOutcome> {
    try {
      const ticket = await this.deps.tickets.getForRequester(code, context.employeeId);

      return {
        model: { found: true, ticket: { ...ticketForModel(ticket), description: ticket.description } },
        part: { type: "tickets", tickets: [ticket] },
        focusTicketCode: ticket.code,
        ...(ticket.overdue
          ? {
              overdueTicket: { code: ticket.code, priority: ticket.priority },
              rationale: [`O chamado ${ticket.code} passou do prazo de resposta.`],
            }
          : {}),
        detail: ticket.overdue ? `${ticket.code} com prazo vencido` : `${ticket.code}: ${statusLabels[ticket.status]}`,
      };
    } catch (error) {
      if (isNotFound(error)) {
        return { model: { found: false, message: `Não existe chamado ${code} deste funcionário.` }, detail: "Chamado não encontrado" };
      }

      return unavailable(error);
    }
  }

  async askToPickTicket(context: TrustedContext, question: string, codes: string[]): Promise<ActionOutcome> {
    try {
      const tickets = await this.deps.tickets.listByRequester(context.employeeId, "all");
      const wanted = new Set(codes);
      const options = tickets.filter((ticket) => wanted.has(ticket.code));

      if (options.length === 0) {
        return { model: { shown: false, message: "Nenhum desses códigos é do funcionário." }, detail: "Nenhum chamado para escolher" };
      }

      return {
        model: { shown: true, options: options.map((ticket) => ticket.code) },
        part: { type: "ticket-picker", question: plainText(question), tickets: options },
        detail: `Pedi para escolher entre ${options.length} chamado(s)`,
      };
    } catch (error) {
      return unavailable(error);
    }
  }

  async proposeNewTicket(context: TrustedContext, proposal: NewTicketProposal): Promise<ActionOutcome> {
    const decision = classifyPriority(proposal);
    let candidates: TicketView[];

    try {
      const related = await this.deps.tickets.findRelated(context.employeeId, proposal.category);
      const acknowledged = new Set(proposal.notDuplicateOf);
      candidates = [...related.open, ...related.reopenable].filter((ticket) => !acknowledged.has(ticket.code));
    } catch (error) {
      return unavailable(error);
    }

    if (candidates.length > 0) {
      return {
        model: {
          draftCreated: false,
          reason:
            "Há chamados da mesma categoria em aberto ou resolvidos há até 7 dias. Pergunte se é o mesmo problema (use askToPickTicket). Se for, proponha atualizar com proposeTicketUpdate. Se não for, chame proposeNewTicket de novo informando os códigos em notDuplicateOf.",
          possibleDuplicates: candidates.map(ticketForModel),
        },
        rationale: candidates.map(
          (ticket) =>
            `Possível duplicidade com ${ticket.code} (${ticket.reopenable ? "resolvido há até 7 dias" : "ainda em aberto"}, mesma categoria).`,
        ),
        detail: `Possível duplicidade com ${candidates.map((ticket) => ticket.code).join(", ")}`,
      };
    }

    const draft = await this.deps.drafts.createDraft({
      conversationId: context.conversationId,
      action: "CREATE",
      targetTicketCode: null,
      type: proposal.type,
      category: proposal.category,
      priority: decision.priority,
      priorityRule: decision.rule,
      affectedScope: proposal.affectedScope,
      title: plainText(proposal.title),
      description: polish(proposal.description.trim(), true),
      expiresAt: draftExpiresAt(this.deps.clock.now()),
    });

    return {
      model: { draftCreated: true, ...draftForModel(draft) },
      part: toDraftPart(draft),
      rationale: [
        `Prioridade ${priorityLabels[decision.priority]}: ${decision.rule}.`,
        ...(proposal.notDuplicateOf.length > 0
          ? [`O funcionário disse que não é o mesmo problema de ${proposal.notDuplicateOf.join(", ")}.`]
          : []),
      ],
      detail: `Rascunho #${draft.number} com prioridade ${priorityLabels[decision.priority]}`,
    };
  }

  async proposeTicketUpdate(context: TrustedContext, code: string, message: string): Promise<ActionOutcome> {
    let ticket: TicketView;

    try {
      ticket = await this.deps.tickets.getForRequester(code, context.employeeId);
    } catch (error) {
      if (isNotFound(error)) {
        return { model: { draftCreated: false, reason: `Não existe chamado ${code} deste funcionário.` }, detail: "Chamado não encontrado" };
      }

      return unavailable(error);
    }

    const closed = ticket.status === "RESOLVED" || ticket.status === "CLOSED";

    if (closed && !ticket.reopenable) {
      return {
        model: {
          draftCreated: false,
          reason: `O chamado ${code} foi resolvido há mais de 7 dias e não pode ser reaberto. Proponha um chamado novo.`,
        },
        rationale: [`${code} foi resolvido há mais de 7 dias: não pode ser reaberto.`],
        detail: `${code} não pode ser reaberto`,
      };
    }

    const draft = await this.deps.drafts.createDraft({
      conversationId: context.conversationId,
      action: "UPDATE",
      targetTicketCode: ticket.code,
      type: ticket.type,
      category: ticket.category,
      priority: ticket.priority,
      priorityRule: null,
      affectedScope: ticket.affectedScope,
      title: ticket.title,
      description: polish(message.trim(), true),
      expiresAt: draftExpiresAt(this.deps.clock.now()),
    });

    return {
      model: { draftCreated: true, willReopen: closed, ...draftForModel(draft) },
      part: toDraftPart(draft),
      focusTicketCode: ticket.code,
      rationale: [
        closed
          ? `${ticket.code} foi resolvido há até 7 dias: dá para reabrir em vez de abrir outro.`
          : `${ticket.code} ainda está aberto: complementar em vez de duplicar.`,
      ],
      detail: `Rascunho #${draft.number} para ${closed ? "reabrir" : "complementar"} ${ticket.code}`,
    };
  }

  offerQuickReplies(options: string[]): ActionOutcome {
    return {
      model: { shown: true },
      part: { type: "quick-replies", options: options.map(plainText) },
      detail: options.join(" · "),
    };
  }
}
