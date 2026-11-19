"use client";

import { useState } from "react";
import type {
  Analyst,
  ConsoleEvent,
  ConsoleMessage,
  ConversationStatus,
  ConversationSummary,
  EmployeeTicket,
} from "@/features/console/types";
import { countByFilter, filterConversations, type ConversationFilter } from "@/features/console/lib/conversation-filters";
import { formatClock } from "@/features/tickets/format-date";
import { ConversationList } from "./conversation-list";
import { ConversationPanel } from "./conversation-panel";
import { EmployeeTicketsPanel } from "./employee-tickets-panel";

type ConsoleViewProps = {
  analyst: Analyst;
  initialConversations: ConversationSummary[];
  initialThreads: Record<string, ConsoleMessage[]>;
  ticketsByConversation: Record<string, EmployeeTicket[]>;
};

export function ConsoleView({ analyst, initialConversations, initialThreads, ticketsByConversation }: ConsoleViewProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [threads, setThreads] = useState(initialThreads);
  const [selectedId, setSelectedId] = useState(initialConversations[0]?.id);
  const [filter, setFilter] = useState<ConversationFilter>("for-you");
  const [query, setQuery] = useState("");
  const [historyOpen, setHistoryOpen] = useState(true);
  const [chatOpenOnMobile, setChatOpenOnMobile] = useState(false);

  const selected = conversations.find((conversation) => conversation.id === selectedId);
  const selectedThread = selected ? (threads[selected.id] ?? []) : [];

  function updateConversation(id: string, changes: Partial<ConversationSummary>) {
    setConversations((current) =>
      current.map((conversation) => (conversation.id === id ? { ...conversation, ...changes } : conversation)),
    );
  }

  function appendMessage(id: string, message: ConsoleMessage) {
    setThreads((current) => ({ ...current, [id]: [...(current[id] ?? []), message] }));
  }

  function recordEvent(id: string, status: ConversationStatus, event: ConsoleEvent) {
    updateConversation(id, { status, statusDetail: undefined, lastActivity: event.time });
    appendMessage(id, { id: crypto.randomUUID(), kind: "event", event });
  }

  function selectConversation(id: string) {
    setSelectedId(id);
    updateConversation(id, { unread: 0 });
    setChatOpenOnMobile(true);
  }

  function now() {
    return formatClock(new Date());
  }

  function reply(id: string, text: string) {
    const time = now();
    appendMessage(id, { id: crypto.randomUUID(), kind: "analyst", author: analyst.name, team: analyst.team, text, time });
    updateConversation(id, { preview: { kind: "message", from: "analyst", text }, lastActivity: time });
  }

  return (
    <div className="flex h-full min-w-0 flex-1">
      <ConversationList
        conversations={filterConversations(conversations, filter, query)}
        counts={countByFilter(conversations)}
        filter={filter}
        onFilterChange={setFilter}
        query={query}
        onQueryChange={setQuery}
        selectedId={selectedId}
        onSelect={selectConversation}
        className={chatOpenOnMobile ? "hidden md:flex" : "flex"}
      />

      {selected ? (
        <>
          <ConversationPanel
            conversation={selected}
            messages={selectedThread}
            historyOpen={historyOpen}
            onShowHistory={() => setHistoryOpen(true)}
            onBack={() => setChatOpenOnMobile(false)}
            onAssume={() => recordEvent(selected.id, "mine", { type: "assume", actor: analyst.name, time: now() })}
            onReturnToAgent={() => recordEvent(selected.id, "agent", { type: "return", actor: analyst.name, time: now() })}
            onClose={() => recordEvent(selected.id, "closed", { type: "close", actor: analyst.name, time: now() })}
            onReply={(text) => reply(selected.id, text)}
            className={chatOpenOnMobile ? "flex" : "hidden md:flex"}
          />
          {historyOpen && (
            <EmployeeTicketsPanel
              employeeName={selected.employee.name}
              conversationStatus={selected.status}
              ticketCode={selected.ticketCode}
              tickets={ticketsByConversation[selected.id] ?? []}
              lastEvent={lastEventOf(selectedThread)}
              onClose={() => setHistoryOpen(false)}
            />
          )}
        </>
      ) : (
        <p className="hidden flex-1 items-center justify-center bg-canvas text-[14.5px] text-muted md:flex">
          Selecione uma conversa
        </p>
      )}
    </div>
  );
}

function lastEventOf(messages: ConsoleMessage[]): ConsoleEvent | undefined {
  const last = messages.findLast((message) => message.kind === "event");
  return last?.kind === "event" ? last.event : undefined;
}
