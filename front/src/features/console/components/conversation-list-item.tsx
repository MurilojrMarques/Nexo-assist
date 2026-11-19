import { CheckCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { ConversationPreview, ConversationSummary } from "@/features/console/types";
import { conversationStatusMeta } from "@/features/console/lib/conversation-status";

type ConversationListItemProps = {
  conversation: ConversationSummary;
  selected: boolean;
  onSelect: () => void;
};

export function ConversationListItem({ conversation, selected, onSelect }: ConversationListItemProps) {
  const status = conversationStatusMeta[conversation.status];
  const hasUnread = conversation.unread > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={`flex w-full gap-3 rounded-xl px-2.5 pt-3 text-left ${selected ? "bg-surface" : "hover:bg-surface/60"}`}
    >
      <Avatar name={conversation.employee.name} online={conversation.employee.online} />
      <span className={`flex min-w-0 flex-1 flex-col gap-0.5 pb-3 ${selected ? "" : "border-b border-line"}`}>
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[15px] font-semibold text-ink">{conversation.employee.name}</span>
          <span className={`shrink-0 text-[12px] ${hasUnread ? "font-semibold text-link" : "text-muted"}`}>
            {conversation.lastActivity}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <PreviewText preview={conversation.preview} />
          {hasUnread && (
            <span className="ml-auto flex size-[18px] shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white">
              <span className="sr-only">Mensagens não lidas: </span>
              {conversation.unread}
            </span>
          )}
        </span>
        <span className={`flex items-center gap-1.5 text-[12px] ${status.text}`}>
          <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${status.dot}`} />
          <span className="truncate">
            {status.label}
            {conversation.statusDetail && ` · ${conversation.statusDetail}`}
          </span>
        </span>
      </span>
    </button>
  );
}

function PreviewText({ preview }: { preview: ConversationPreview }) {
  if (preview.kind === "typing") {
    return <span className="truncate text-[13.5px] text-success-ink italic">digitando…</span>;
  }

  return (
    <span className="flex min-w-0 items-center gap-1 text-[13.5px] text-ink-soft">
      {preview.from === "agent" && <CheckCheck aria-hidden="true" className="size-3.5 shrink-0 text-link" />}
      <span className="truncate">
        {preview.from === "agent" && "Nexo: "}
        {preview.from === "analyst" && "Você: "}
        {preview.text}
      </span>
    </span>
  );
}
