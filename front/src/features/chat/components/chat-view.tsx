"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentPart, ChatMessage, QuickReplyOption } from "@/features/chat/types";
import type { TicketSummary } from "@/features/tickets/types";
import { isLimitReached, type SessionUsage } from "@/features/chat/lib/session-usage";
import { AgentMessage } from "./agent-message";
import { Composer } from "./composer";
import { UserMessage } from "./user-message";

type ChatViewProps = {
  initialMessages: ChatMessage[];
  initialUsage: SessionUsage;
};

export function ChatView({ initialMessages, initialUsage }: ChatViewProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [usage, setUsage] = useState(initialUsage);
  const scrollRef = useRef<HTMLDivElement>(null);
  const limitReached = isLimitReached(usage);

  useEffect(() => {
    const container = scrollRef.current;

    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  function sendMessage(text: string) {
    if (limitReached) {
      return;
    }

    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text }]);
    setUsage((current) => ({ ...current, used: current.used + 1 }));
  }

  function updatePart(messageId: string, partIndex: number, update: (part: AgentPart) => AgentPart) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId && message.role === "agent"
          ? { ...message, parts: message.parts.map((part, index) => (index === partIndex ? update(part) : part)) }
          : message,
      ),
    );
  }

  function chooseReply(messageId: string, partIndex: number, option: QuickReplyOption) {
    if (limitReached) {
      return;
    }

    updatePart(messageId, partIndex, (part) =>
      part.type === "text" && part.replies ? { ...part, replies: { ...part.replies, selected: option.value } } : part,
    );
    sendMessage(option.label);
  }

  function pickTicket(messageId: string, partIndex: number, ticket: TicketSummary) {
    if (limitReached) {
      return;
    }

    updatePart(messageId, partIndex, (part) =>
      part.type === "ticket-picker" ? { ...part, selected: ticket.code } : part,
    );
    sendMessage(`${ticket.code} · ${ticket.title}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-7 pb-1 md:px-[16.95%]">
        <ol aria-label="Conversa" className="mt-auto flex flex-col gap-5">
          {messages.map((message) => (
            <li key={message.id}>
              {message.role === "user" ? (
                <UserMessage text={message.text} />
              ) : (
                <AgentMessage
                  message={message}
                  onReply={(partIndex, option) => chooseReply(message.id, partIndex, option)}
                  onPickTicket={(partIndex, ticket) => pickTicket(message.id, partIndex, ticket)}
                />
              )}
            </li>
          ))}
        </ol>
      </div>

      <Composer usage={usage} onSend={sendMessage} />
    </div>
  );
}
