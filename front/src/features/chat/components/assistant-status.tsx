import type { ConversationStatus } from "@/features/chat/api/conversation-api";

const statusView: Record<ConversationStatus, { label: string; badge: string; dot: string }> = {
  WITH_AGENT: { label: "Assistente online", badge: "bg-success/8 text-success-ink", dot: "bg-success" },
  WAITING_ANALYST: { label: "Aguardando analista", badge: "bg-warning/10 text-warning-ink", dot: "bg-warning" },
  WITH_ANALYST: { label: "Com analista", badge: "bg-primary/8 text-link", dot: "bg-primary" },
  CLOSED: { label: "Conversa encerrada", badge: "bg-ink/5 text-muted", dot: "bg-muted" },
};

type AssistantStatusProps = {
  status?: ConversationStatus | null;
};

export function AssistantStatus({ status }: AssistantStatusProps) {
  const view = statusView[status ?? "WITH_AGENT"];

  return (
    <span
      role="status"
      className={`flex shrink-0 items-center gap-[7px] rounded-full px-2.5 py-[5px] text-[12.5px] font-semibold whitespace-nowrap ${view.badge}`}
    >
      <span aria-hidden="true" className={`size-[7px] rounded-full ${view.dot}`} />
      {view.label}
    </span>
  );
}
