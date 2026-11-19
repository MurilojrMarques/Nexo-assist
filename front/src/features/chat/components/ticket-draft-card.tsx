"use client";

import { useEffect } from "react";
import type { DraftStatus, TicketDraft } from "@/features/chat/types";
import { priorityDotClass } from "@/features/tickets/priority";
import { TicketField } from "@/features/tickets/components/ticket-field";

const statusStyle: Record<DraftStatus, { dot: string; text: string }> = {
  pending: { dot: "bg-warning", text: "text-warning-ink" },
  confirmed: { dot: "bg-success", text: "text-success-ink" },
  cancelled: { dot: "bg-muted", text: "text-muted" },
  expired: { dot: "bg-muted", text: "text-muted" },
};

function statusLabel(draft: TicketDraft): string {
  switch (draft.status) {
    case "pending":
      return "Aguardando confirmação";
    case "confirmed":
      return `${draft.action === "CREATE" ? "Chamado criado" : "Chamado atualizado"}${draft.resultTicketCode ? ` · ${draft.resultTicketCode}` : ""}`;
    case "cancelled":
      return "Rascunho cancelado";
    case "expired":
      return "Rascunho expirado";
  }
}

type TicketDraftCardProps = {
  draft: TicketDraft;
  actionable: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onEdit: () => void;
};

export function TicketDraftCard({ draft, actionable, busy = false, onConfirm, onCancel, onEdit }: TicketDraftCardProps) {
  const showActions = actionable && draft.status === "pending";
  const style = statusStyle[draft.status];

  useEffect(() => {
    if (!showActions || busy) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onConfirm();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showActions, busy, onConfirm]);

  return (
    <section
      aria-label={`Rascunho #${draft.number}`}
      aria-busy={busy}
      className="w-full overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_#1b24310d,0_6px_18px_#1b24310a] outline outline-ink/9"
    >
      <div className="flex flex-col gap-1.5 px-[18px] pt-4 pb-3.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pb-0.5 text-[12.5px] text-muted">
          <span className="font-medium">{draft.action === "CREATE" ? "Novo chamado" : `Atualizar ${draft.targetTicketCode}`}</span>
          <span aria-hidden="true" className="size-[3px] rounded-full bg-line" />
          <span>Rascunho #{draft.number}</span>
          <span role="status" className={`ml-auto flex items-center gap-1.5 font-medium ${style.text}`}>
            <span aria-hidden="true" className={`size-1.5 rounded-full ${style.dot}`} />
            {statusLabel(draft)}
          </span>
        </div>
        <h3 className="text-lg/[23px] font-semibold tracking-[-0.2px] text-ink">{draft.title}</h3>
        <p className="text-[13.5px]/5 whitespace-pre-line text-ink-soft">{draft.description}</p>
      </div>

      <dl className="mx-[18px] mb-4 grid gap-x-6 gap-y-3 border-t border-line pt-3 sm:grid-cols-3">
        <TicketField label="Categoria">{draft.category}</TicketField>
        <TicketField label="Prioridade">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-1.5 rounded-full ${priorityDotClass[draft.priority]}`} />
            {draft.priority}
          </span>
          <span className="text-[13.5px] font-normal text-muted">· resposta em até {draft.responseTarget}</span>
        </TicketField>
        <TicketField label="Afetados">{draft.affected}</TicketField>
      </dl>

      {showActions && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line bg-surface py-2 pr-3.5 pl-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            aria-keyshortcuts="Meta+Enter Control+Enter"
            className="flex h-9 items-center gap-2 rounded-lg bg-primary pr-2.5 pl-3.5 text-[13.5px] font-semibold text-white hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
          >
            Confirmar
            <kbd aria-hidden="true" className="rounded-md bg-white/14 px-[5px] py-px font-sans text-[11.5px] font-normal text-white/80">
              ⌘↵
            </kbd>
          </button>
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            className="h-9 rounded-lg bg-white px-3.5 text-[13.5px] font-medium text-ink shadow-[0_1px_2px_#1b24310d] outline outline-ink/12 hover:bg-surface disabled:opacity-60"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-9 rounded-lg px-3.5 text-[13.5px] font-medium text-ink-soft hover:bg-ink/5 disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      )}
    </section>
  );
}
