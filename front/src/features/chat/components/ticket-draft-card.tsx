"use client";

import { useEffect, useState } from "react";
import type { TicketDraft } from "@/features/chat/types";
import { priorityDotClass } from "@/features/tickets/priority";
import { TicketField } from "@/features/tickets/components/ticket-field";

type DraftStatus = "pending" | "confirmed" | "cancelled";

const statusStyle: Record<DraftStatus, { label: string; dot: string; text: string }> = {
  pending: { label: "Aguardando confirmação", dot: "bg-warning", text: "text-warning-ink" },
  confirmed: { label: "Chamado criado", dot: "bg-success", text: "text-success-ink" },
  cancelled: { label: "Rascunho cancelado", dot: "bg-muted", text: "text-muted" },
};

type TicketDraftCardProps = {
  draft: TicketDraft;
};

export function TicketDraftCard({ draft }: TicketDraftCardProps) {
  const [status, setStatus] = useState<DraftStatus>("pending");
  const pending = status === "pending";
  const style = statusStyle[status];

  useEffect(() => {
    if (!pending) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setStatus("confirmed");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pending]);

  return (
    <section
      aria-label={`Rascunho ${draft.code}`}
      className="w-full overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_#1b24310d,0_6px_18px_#1b24310a] outline outline-ink/9"
    >
      <div className="flex flex-col gap-1.5 px-[18px] pt-4 pb-3.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pb-0.5 text-[12.5px] text-muted">
          <span className="font-medium">Novo chamado</span>
          <span aria-hidden="true" className="size-[3px] rounded-full bg-line" />
          <span>Rascunho {draft.code}</span>
          <span role="status" className={`ml-auto flex items-center gap-1.5 font-medium ${style.text}`}>
            <span aria-hidden="true" className={`size-1.5 rounded-full ${style.dot}`} />
            {style.label}
          </span>
        </div>
        <h3 className="text-lg/[23px] font-semibold tracking-[-0.2px] text-ink">{draft.title}</h3>
        <p className="text-[13.5px]/5 text-ink-soft">{draft.description}</p>
      </div>

      <dl className="mx-[18px] mb-4 grid gap-x-6 gap-y-3 border-t border-line pt-3 sm:grid-cols-3">
        <TicketField label="Categoria">{draft.category}</TicketField>
        <TicketField label="Prioridade">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-1.5 rounded-full ${priorityDotClass[draft.priority]}`} />
            {draft.priority}
          </span>
          <span className="text-[13.5px] font-normal text-muted">· resposta até {draft.responseDue}</span>
        </TicketField>
        <TicketField label="Afetados">{draft.affected}</TicketField>
      </dl>

      {pending && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line bg-surface py-2 pr-3.5 pl-2">
          <button
            type="button"
            onClick={() => setStatus("confirmed")}
            aria-keyshortcuts="Meta+Enter Control+Enter"
            className="flex h-9 items-center gap-2 rounded-lg bg-primary pr-2.5 pl-3.5 text-[13.5px] font-semibold text-white hover:bg-primary/90"
          >
            Confirmar
            <kbd aria-hidden="true" className="rounded-md bg-white/14 px-[5px] py-px font-sans text-[11.5px] font-normal text-white/80">
              ⌘↵
            </kbd>
          </button>
          <button
            type="button"
            className="h-9 rounded-lg bg-white px-3.5 text-[13.5px] font-medium text-ink shadow-[0_1px_2px_#1b24310d] outline outline-ink/12 hover:bg-surface"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setStatus("cancelled")}
            className="h-9 rounded-lg px-3.5 text-[13.5px] font-medium text-ink-soft hover:bg-ink/5"
          >
            Cancelar
          </button>
        </div>
      )}
    </section>
  );
}
