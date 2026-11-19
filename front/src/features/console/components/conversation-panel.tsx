"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, Bot, CircleCheck, EllipsisVertical, PanelRight, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { ConsoleMessage as ConsoleMessageData, ConversationSummary } from "@/features/console/types";
import { ConsoleMessage } from "./console-message";
import { ConversationFooter, ReturnToAgentButton } from "./conversation-footer";

type ConversationPanelProps = {
  conversation: ConversationSummary;
  messages: ConsoleMessageData[];
  historyOpen: boolean;
  onShowHistory: () => void;
  onBack: () => void;
  onAssume: () => void;
  onReturnToAgent: () => void;
  onClose: () => void;
  onReply: (text: string) => void;
  className?: string;
};

export function ConversationPanel({
  conversation,
  messages,
  historyOpen,
  onShowHistory,
  onBack,
  onAssume,
  onReturnToAgent,
  onClose,
  onReply,
  className = "",
}: ConversationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { employee } = conversation;

  useEffect(() => {
    const container = scrollRef.current;

    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  return (
    <section aria-label={`Conversa com ${employee.name}`} className={`min-w-0 flex-1 flex-col ${className}`}>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-3 md:px-5">
        <IconButton label="Voltar para as conversas" onClick={onBack} display="flex md:hidden">
          <ArrowLeft className="size-4" />
        </IconButton>
        <Avatar name={employee.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink">{employee.name}</p>
          <p className="truncate text-[12.5px] text-muted">
            {employee.online ? "online" : "offline"} · {employee.department}
            {conversation.ticketCode && ` · ${conversation.ticketCode}`}
          </p>
        </div>

        {conversation.status === "mine" ? (
          <div className="hidden items-center gap-2 sm:flex">
            <ReturnToAgentButton onClick={onReturnToAgent} />
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 items-center gap-2 rounded-lg bg-danger/8 px-3.5 text-[13.5px] font-semibold text-danger hover:bg-danger/12"
            >
              <CircleCheck aria-hidden="true" className="size-4" />
              Encerrar atendimento
            </button>
          </div>
        ) : (
          <>
            <ConversationStatusPill conversation={conversation} />
            <IconButton label="Buscar na conversa">
              <Search className="size-4" />
            </IconButton>
          </>
        )}

        {!historyOpen && (
          <IconButton label="Mostrar chamados" onClick={onShowHistory} display="hidden xl:flex">
            <PanelRight className="size-4" />
          </IconButton>
        )}
        <IconButton label="Mais opções">
          <EllipsisVertical className="size-4" />
        </IconButton>
      </header>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-canvas px-4 py-6 md:px-[6%]">
        <ol aria-label="Mensagens" className="mt-auto flex flex-col gap-3">
          {messages.map((message) => (
            <li key={message.id}>
              <ConsoleMessage message={message} />
            </li>
          ))}
        </ol>
      </div>

      <ConversationFooter
        conversation={conversation}
        onAssume={onAssume}
        onReturnToAgent={onReturnToAgent}
        onReply={onReply}
      />
    </section>
  );
}

function ConversationStatusPill({ conversation }: { conversation: ConversationSummary }) {
  const pills = {
    transferred: { label: "Aguardando atendente", tone: "bg-warning/12 text-warning-ink" },
    "agent-help": { label: "Agent pediu ajuda", tone: "bg-warning/12 text-warning-ink" },
    agent: { label: "Com o agent", tone: "bg-success/8 text-success-ink" },
    mine: { label: "Você está atendendo", tone: "bg-accent/7 text-link" },
    resolved: { label: "Encerrada", tone: "bg-surface text-muted" },
    closed: { label: "Encerrada", tone: "bg-surface text-muted" },
  };
  const pill = pills[conversation.status];

  return (
    <span className={`hidden shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold sm:flex ${pill.tone}`}>
      <Bot aria-hidden="true" className="size-3.5" />
      {pill.label}
    </span>
  );
}

type IconButtonProps = {
  label: string;
  onClick?: () => void;
  display?: string;
  children: ReactNode;
};

function IconButton({ label, onClick, display = "flex", children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`size-9 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 ${display}`}
    >
      {children}
    </button>
  );
}
