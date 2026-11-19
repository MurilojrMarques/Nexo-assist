import { Check, LoaderCircle, X } from "lucide-react";
import type { AgentMessage as AgentMessageData, AgentPart, AgentStep, QuickReplyOption } from "@/features/chat/types";
import type { TicketSummary } from "@/features/tickets/types";
import { TicketDetailsCard } from "@/features/tickets/components/ticket-details-card";
import { TicketList } from "@/features/tickets/components/ticket-list";
import { TicketPicker } from "@/features/tickets/components/ticket-picker";
import { ArticleList } from "./article-list";
import { HandoffNotice } from "./handoff-notice";
import { QuickReplies } from "./quick-replies";
import { TicketDraftCard } from "./ticket-draft-card";

export type AgentMessageHandlers = {
  onReply: (partIndex: number, option: QuickReplyOption) => void;
  onPickTicket: (partIndex: number, ticket: TicketSummary) => void;
  onConfirmDraft: (draftId: string) => void;
  onCancelDraft: (draftId: string) => void;
  onEditDraft: () => void;
};

type AgentMessageProps = AgentMessageHandlers & {
  message: AgentMessageData;
  interactive: boolean;
  draftsEnabled: boolean;
  draftInFlight: string | null;
};

function StepIcon({ status }: { status: AgentStep["status"] }) {
  switch (status) {
    case "running":
      return <LoaderCircle aria-hidden="true" className="size-3 animate-spin" />;
    case "ok":
      return <Check aria-hidden="true" className="size-3" />;
    case "error":
      return <X aria-hidden="true" className="size-3 text-danger" />;
  }
}

function TypingBubble() {
  return (
    <div
      role="status"
      aria-label="Nexo está respondendo"
      className="flex gap-1 rounded-[4px_12px_12px_12px] bg-white px-4 py-[15px] outline outline-line"
    >
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          aria-hidden="true"
          style={{ animationDelay: `${delay}ms` }}
          className="size-1.5 animate-pulse rounded-full bg-muted"
        />
      ))}
    </div>
  );
}

export function AgentMessage({ message, interactive, draftsEnabled, draftInFlight, ...handlers }: AgentMessageProps) {
  const waiting = message.streaming && message.parts.length === 0;

  return (
    <article aria-label={`Resposta de ${message.author}`} aria-busy={message.streaming} className="flex flex-col items-start gap-1.5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
        <span className="font-semibold text-ink">{message.author}</span>
        {message.steps.length > 0 && (
          <ul aria-label="Ações do assistente" className="contents">
            {message.steps.map((step) => (
              <li key={step.id} className="flex items-center gap-[5px] text-muted">
                <StepIcon status={step.status} />
                {step.label}
              </li>
            ))}
          </ul>
        )}
      </header>

      {waiting && <TypingBubble />}

      {message.parts.map((part, index) => (
        <AgentPartView
          key={index}
          part={part}
          interactive={interactive}
          draftsEnabled={draftsEnabled}
          draftInFlight={draftInFlight}
          onReply={(option) => handlers.onReply(index, option)}
          onPickTicket={(ticket) => handlers.onPickTicket(index, ticket)}
          onConfirmDraft={handlers.onConfirmDraft}
          onCancelDraft={handlers.onCancelDraft}
          onEditDraft={handlers.onEditDraft}
        />
      ))}
    </article>
  );
}

type AgentPartViewProps = Pick<AgentMessageHandlers, "onConfirmDraft" | "onCancelDraft" | "onEditDraft"> & {
  part: AgentPart;
  interactive: boolean;
  draftsEnabled: boolean;
  draftInFlight: string | null;
  onReply: (option: QuickReplyOption) => void;
  onPickTicket: (ticket: TicketSummary) => void;
};

function AgentPartView({ part, interactive, draftsEnabled, draftInFlight, onReply, onPickTicket, onConfirmDraft, onCancelDraft, onEditDraft }: AgentPartViewProps) {
  switch (part.type) {
    case "text":
      return (
        <div className="flex w-full flex-col gap-3 rounded-[4px_12px_12px_12px] bg-white px-4 py-3 outline outline-line sm:w-[76.92%]">
          <p className="text-[14.5px]/[22px] whitespace-pre-line text-ink">{part.text}</p>
          {part.replies && <QuickReplies replies={part.replies} disabled={!interactive} onSelect={onReply} />}
        </div>
      );
    case "ticket-picker":
      return <TicketPicker tickets={part.tickets} selected={part.selected} disabled={!interactive} onSelect={onPickTicket} />;
    case "ticket-details":
      return <TicketDetailsCard ticket={part.ticket} />;
    case "ticket-list":
      return <TicketList tickets={part.tickets} />;
    case "ticket-draft":
      return (
        <TicketDraftCard
          draft={part.draft}
          actionable={draftsEnabled}
          busy={draftInFlight === part.draft.id}
          onConfirm={() => onConfirmDraft(part.draft.id)}
          onCancel={() => onCancelDraft(part.draft.id)}
          onEdit={onEditDraft}
        />
      );
    case "articles":
      return <ArticleList articles={part.articles} />;
    case "handoff":
      return <HandoffNotice team={part.team} reason={part.reason} />;
  }
}
