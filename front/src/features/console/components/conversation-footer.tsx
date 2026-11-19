"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Bot, Hand, Headset, SendHorizontal } from "lucide-react";
import type { ConversationSummary } from "@/features/console/types";

type ConversationFooterProps = {
  conversation: ConversationSummary;
  onAssume: () => void;
  onReturnToAgent: () => void;
  onReply: (text: string) => void;
};

export function ConversationFooter({ conversation, onAssume, onReturnToAgent, onReply }: ConversationFooterProps) {
  const firstName = conversation.employee.name.split(" ")[0];

  switch (conversation.status) {
    case "mine":
      return <AnalystComposer firstName={firstName} onReply={onReply} />;
    case "transferred":
    case "agent-help":
      return (
        <FooterShell>
          <div className="flex flex-wrap items-center gap-3">
            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/12 text-warning-ink">
              <Hand className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-semibold text-ink">{firstName} espera um atendente</p>
              <p className="text-[12.5px] text-muted">{waitingDetail(conversation)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ReturnToAgentButton onClick={onReturnToAgent} />
              <AssumeButton onClick={onAssume} />
            </div>
          </div>
          <LockedInput placeholder="Assuma o atendimento para responder" />
        </FooterShell>
      );
    case "agent":
      return (
        <FooterShell>
          <div className="flex flex-wrap items-center gap-3">
            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/8 text-success-ink">
              <Bot className="size-4" />
            </span>
            <p className="min-w-0 flex-1 text-[14.5px] font-semibold text-ink">O agent está atendendo esta conversa</p>
            <AssumeButton onClick={onAssume} />
          </div>
          <LockedInput placeholder="Assuma o atendimento para responder" />
        </FooterShell>
      );
    case "resolved":
    case "closed":
      return (
        <FooterShell>
          <p className="text-center text-[13.5px] text-muted">Esta conversa foi encerrada.</p>
        </FooterShell>
      );
  }
}

function waitingDetail(conversation: ConversationSummary): string {
  if (conversation.status === "agent-help") {
    return conversation.statusDetail ? `O agent pediu ajuda · ${conversation.statusDetail}` : "O agent pediu ajuda";
  }

  return conversation.agentPausedUntil ? `Agent pausado · até ${conversation.agentPausedUntil}` : "Agent pausado";
}

function FooterShell({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 flex-col gap-3 border-t border-line bg-white px-4 pt-3 pb-4 md:px-5">{children}</div>;
}

function LockedInput({ placeholder }: { placeholder: string }) {
  return (
    <input
      disabled
      aria-label="Resposta"
      placeholder={placeholder}
      className="h-11 w-full rounded-xl bg-surface px-4 text-[14.5px] placeholder:text-muted disabled:cursor-not-allowed"
    />
  );
}

function AssumeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-[13.5px] font-semibold text-white hover:bg-primary/90"
    >
      <Headset aria-hidden="true" className="size-4" />
      Assumir atendimento
    </button>
  );
}

export function ReturnToAgentButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 items-center gap-2 rounded-lg bg-white px-3.5 text-[13.5px] font-medium text-ink shadow-[0_1px_2px_#1b24310d] outline outline-ink/12 hover:bg-surface"
    >
      <Bot aria-hidden="true" className="size-4" />
      Devolver ao agent
    </button>
  );
}

type AnalystComposerProps = {
  firstName: string;
  onReply: (text: string) => void;
};

function AnalystComposer({ firstName, onReply }: AnalystComposerProps) {
  const [text, setText] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = text.trim();

    if (!message) {
      return;
    }

    onReply(message);
    setText("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-3 border-t border-line bg-white px-4 py-3 md:px-5">
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-label={`Resposta para ${firstName}`}
        placeholder={`Escreva para ${firstName}…`}
        autoComplete="off"
        className="h-12 min-w-0 flex-1 rounded-xl bg-surface px-4 text-[14.5px] text-ink outline-none placeholder:text-muted focus:outline-[1.5px] focus:outline-primary"
      />
      <button
        type="submit"
        aria-label="Enviar resposta"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90"
      >
        <SendHorizontal aria-hidden="true" className="size-5" />
      </button>
    </form>
  );
}
