import type { ConversationStatus } from "@/features/console/types";

type StatusMeta = {
  label: string;
  dot: string;
  text: string;
};

export const conversationStatusMeta: Record<ConversationStatus, StatusMeta> = {
  transferred: { label: "Transferida", dot: "bg-danger", text: "text-danger" },
  "agent-help": { label: "Agent pediu ajuda", dot: "bg-warning", text: "text-warning-ink" },
  agent: { label: "Agent atendendo", dot: "bg-success", text: "text-ink-soft" },
  mine: { label: "Você está atendendo", dot: "bg-primary", text: "text-link" },
  resolved: { label: "Resolvida pelo agent", dot: "bg-ink/25", text: "text-muted" },
  closed: { label: "Encerrada por você", dot: "bg-ink/25", text: "text-muted" },
};

export function needsAnalyst(status: ConversationStatus): boolean {
  return status === "transferred" || status === "agent-help";
}

export function isActive(status: ConversationStatus): boolean {
  return status !== "resolved" && status !== "closed";
}
