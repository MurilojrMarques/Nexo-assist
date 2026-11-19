import { Check } from "lucide-react";
import type { AgentMessage as AgentMessageData, AgentPart, QuickReplyOption } from "@/features/chat/types";
import type { TicketSummary } from "@/features/tickets/types";
import { TicketDetailsCard } from "@/features/tickets/components/ticket-details-card";
import { TicketPicker } from "@/features/tickets/components/ticket-picker";
import { QuickReplies } from "./quick-replies";
import { TicketDraftCard } from "./ticket-draft-card";

type AgentMessageProps = {
  message: AgentMessageData;
  onReply: (partIndex: number, option: QuickReplyOption) => void;
  onPickTicket: (partIndex: number, ticket: TicketSummary) => void;
};

export function AgentMessage({ message, onReply, onPickTicket }: AgentMessageProps) {
  return (
    <article aria-label="Resposta do Nexo Assist" className="flex flex-col items-start gap-1.5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
        <span className="font-semibold text-ink">Nexo Assist</span>
        {message.steps.length > 0 && (
          <ul aria-label="Ações do assistente" className="contents">
            {message.steps.map((step) => (
              <li key={step} className="flex items-center gap-[5px] text-muted">
                <Check aria-hidden="true" className="size-3" />
                {step}
              </li>
            ))}
          </ul>
        )}
      </header>

      {message.parts.map((part, index) => (
        <AgentPartView
          key={index}
          part={part}
          onReply={(option) => onReply(index, option)}
          onPickTicket={(ticket) => onPickTicket(index, ticket)}
        />
      ))}
    </article>
  );
}

type AgentPartViewProps = {
  part: AgentPart;
  onReply: (option: QuickReplyOption) => void;
  onPickTicket: (ticket: TicketSummary) => void;
};

function AgentPartView({ part, onReply, onPickTicket }: AgentPartViewProps) {
  switch (part.type) {
    case "text":
      return (
        <div className="flex w-full flex-col gap-3 rounded-[4px_12px_12px_12px] bg-white px-4 py-3 outline outline-line sm:w-[76.92%]">
          <p className="text-[14.5px]/[22px] text-ink">{part.text}</p>
          {part.replies && <QuickReplies replies={part.replies} onSelect={onReply} />}
        </div>
      );
    case "ticket-picker":
      return <TicketPicker tickets={part.tickets} selected={part.selected} onSelect={onPickTicket} />;
    case "ticket-details":
      return <TicketDetailsCard ticket={part.ticket} />;
    case "ticket-draft":
      return <TicketDraftCard draft={part.draft} />;
  }
}
