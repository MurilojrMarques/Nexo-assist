import type { TicketStatus } from "./types";

type StatusStyle = {
  dot: string;
  text: string;
};

export const ticketStatusStyle: Record<TicketStatus, StatusStyle> = {
  "Aguardando analista": { dot: "bg-warning", text: "text-warning-ink" },
  "Em atendimento": { dot: "bg-primary", text: "text-link" },
  "Em andamento": { dot: "bg-accent", text: "text-link" },
  Aprovado: { dot: "bg-success", text: "text-success-ink" },
  Resolvido: { dot: "bg-ink/25", text: "text-muted" },
  Fechado: { dot: "bg-ink/25", text: "text-muted" },
};

export function isTicketClosed(status: TicketStatus): boolean {
  return status === "Resolvido" || status === "Fechado";
}
