import type { TicketStatus } from "./types";

type StatusStyle = {
  dot: string;
  text: string;
};

export const ticketStatusStyle: Record<TicketStatus, StatusStyle> = {
  "Aguardando analista": { dot: "bg-warning", text: "text-warning-ink" },
  "Em andamento": { dot: "bg-accent", text: "text-link" },
  Aprovado: { dot: "bg-success", text: "text-success-ink" },
  Resolvido: { dot: "bg-success", text: "text-success-ink" },
  Fechado: { dot: "bg-muted", text: "text-muted" },
};
