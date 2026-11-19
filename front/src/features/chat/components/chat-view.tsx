"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { AgentPart, ChatMessage, QuickReplyOption } from "@/features/chat/types";
import type { TicketSummary } from "@/features/tickets/types";
import { isLimitReached, type SessionUsage } from "@/features/chat/lib/session-usage";
import { hideRepeatedArticles } from "@/features/chat/lib/to-chat-message";
import { AgentMessage } from "./agent-message";
import { Composer, type ComposerHandle } from "./composer";
import { UserMessage } from "./user-message";

export const EDIT_DRAFT_PREFIX = "Quero mudar no rascunho: ";

type ChatViewProps = {
  messages: ChatMessage[];
  usage: SessionUsage;
  loading?: boolean;
  busy?: boolean;
  error?: string | null;
  draftInFlight?: string | null;
  onSend: (text: string) => void;
  onConfirmDraft: (draftId: string) => void;
  onCancelDraft: (draftId: string) => void;
  onDismissError?: () => void;
};

function selectionKey(messageId: string, partIndex: number): string {
  return `${messageId}:${partIndex}`;
}

function withSelection(part: AgentPart, selected: string | undefined): AgentPart {
  if (selected === undefined) {
    return part;
  }

  if (part.type === "text" && part.replies) {
    return { ...part, replies: { ...part.replies, selected } };
  }

  return part.type === "ticket-picker" ? { ...part, selected } : part;
}

export function ChatView({
  messages,
  usage,
  loading = false,
  busy = false,
  error = null,
  draftInFlight = null,
  onSend,
  onConfirmDraft,
  onCancelDraft,
  onDismissError,
}: ChatViewProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<ComposerHandle>(null);
  const visibleMessages = useMemo(() => hideRepeatedArticles(messages), [messages]);
  const limitReached = isLimitReached(usage);
  const last = messages.at(-1);
  const answerable = last?.role === "agent" && !last.streaming && !busy && !limitReached ? last.id : null;

  useEffect(() => {
    const container = scrollRef.current;

    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  function choose(messageId: string, partIndex: number, value: string, text: string) {
    if (messageId !== answerable) {
      return;
    }

    setSelections((current) => ({ ...current, [selectionKey(messageId, partIndex)]: value }));
    onSend(text);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-7 pb-1 md:px-[16.95%]">
        {loading ? (
          <p role="status" className="m-auto text-[13.5px] text-muted">
            Carregando sua conversa…
          </p>
        ) : messages.length === 0 ? (
          <div className="m-auto flex max-w-sm flex-col items-center gap-1.5 text-center">
            <p className="text-[15px] font-semibold text-ink">Como posso ajudar com TI hoje?</p>
            <p className="text-[13.5px]/5 text-muted">
              Conte o que está acontecendo. Eu procuro a solução, consulto seus chamados ou preparo um novo para você confirmar.
            </p>
          </div>
        ) : (
          <ol aria-label="Conversa" className="mt-auto flex flex-col gap-5">
            {visibleMessages.map((message) => (
              <li key={message.id}>
                {message.role === "user" ? (
                  <UserMessage text={message.text} />
                ) : (
                  <AgentMessage
                    message={{
                      ...message,
                      parts: message.parts.map((part, index) => withSelection(part, selections[selectionKey(message.id, index)])),
                    }}
                    interactive={message.id === answerable}
                    draftsEnabled={!busy}
                    draftInFlight={draftInFlight}
                    onReply={(partIndex, option: QuickReplyOption) => choose(message.id, partIndex, option.value, option.label)}
                    onPickTicket={(partIndex, ticket: TicketSummary) =>
                      choose(message.id, partIndex, ticket.code, `${ticket.code} · ${ticket.title}`)
                    }
                    onConfirmDraft={onConfirmDraft}
                    onCancelDraft={onCancelDraft}
                    onEditDraft={() => composerRef.current?.focusWith(EDIT_DRAFT_PREFIX)}
                  />
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mx-4 mt-2 flex items-start gap-2 rounded-lg bg-danger/8 px-3.5 py-2.5 text-[13.5px] text-danger md:mx-[16.95%]"
        >
          <span className="flex-1">{error}</span>
          {onDismissError && (
            <button type="button" onClick={onDismissError} aria-label="Fechar aviso" className="shrink-0 rounded p-0.5 hover:bg-danger/10">
              <X aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </div>
      )}

      <Composer ref={composerRef} usage={usage} busy={busy || loading} onSend={onSend} />
    </div>
  );
}
