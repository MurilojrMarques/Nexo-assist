"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { ConversationSummary } from "@/features/console/types";
import { conversationFilters, type ConversationFilter } from "@/features/console/lib/conversation-filters";
import { ConversationListItem } from "./conversation-list-item";

type ConversationListProps = {
  conversations: ConversationSummary[];
  counts: Record<ConversationFilter, number>;
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  query: string;
  onQueryChange: (query: string) => void;
  selectedId?: string;
  onSelect: (id: string) => void;
  className?: string;
};

export function ConversationList({
  conversations,
  counts,
  filter,
  onFilterChange,
  query,
  onQueryChange,
  selectedId,
  onSelect,
  className = "",
}: ConversationListProps) {
  const [available, setAvailable] = useState(true);

  return (
    <section
      aria-label="Lista de conversas"
      className={`w-full shrink-0 flex-col border-r border-line bg-white md:w-[27.62%] md:min-w-[300px] ${className}`}
    >
      <header className="flex flex-col gap-3 px-3.5 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3 px-1.5">
          <h1 className="text-[22px] font-bold tracking-[-0.4px] text-ink">Conversas</h1>
          <button
            type="button"
            onClick={() => setAvailable((current) => !current)}
            aria-pressed={available}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${
              available ? "bg-success/8 text-success-ink" : "bg-surface text-muted"
            }`}
          >
            <span aria-hidden="true" className={`size-[7px] rounded-full ${available ? "bg-success" : "bg-ink/25"}`} />
            {available ? "Disponível" : "Ausente"}
          </button>
        </div>

        <label className="flex h-10 items-center gap-2.5 rounded-full bg-surface px-3.5 focus-within:outline-[1.5px] focus-within:outline-primary">
          <Search aria-hidden="true" className="size-4 shrink-0 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Pesquisar conversa ou chamado"
            aria-label="Pesquisar conversa ou chamado"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted"
          />
        </label>

        <div role="group" aria-label="Filtrar conversas" className="flex flex-wrap gap-1.5">
          {conversationFilters.map((option) => {
            const active = option.value === filter;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onFilterChange(option.value)}
                aria-pressed={active}
                aria-label={option.showCount ? `${option.label} (${counts[option.value]})` : option.label}
                className={`rounded-lg px-2.5 py-1 text-[12.5px] font-medium ${
                  active ? "bg-accent/7 text-link" : "bg-surface text-ink-soft hover:bg-ink/5"
                }`}
              >
                {option.label}
                {option.showCount && <span className="ml-1.5 font-semibold">{counts[option.value]}</span>}
              </button>
            );
          })}
        </div>
      </header>

      <ul aria-label="Conversas" className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {conversations.map((conversation) => (
          <li key={conversation.id}>
            <ConversationListItem
              conversation={conversation}
              selected={conversation.id === selectedId}
              onSelect={() => onSelect(conversation.id)}
            />
          </li>
        ))}
      </ul>

      {conversations.length === 0 && (
        <p className="px-6 py-8 text-center text-[13.5px] text-muted">Nenhuma conversa encontrada.</p>
      )}
    </section>
  );
}
