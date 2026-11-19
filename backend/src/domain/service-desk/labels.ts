import type { AffectedScope, TicketCategory, TicketPriority, TicketStatus, TicketType } from "./types.js";

export const typeLabels: Record<TicketType, string> = {
  INCIDENT: "Incidente",
  REQUEST: "Solicitação",
};

export const categoryLabels: Record<TicketCategory, string> = {
  ACCESS: "Acesso",
  NETWORK_VPN: "Rede e VPN",
  HARDWARE: "Hardware",
  SOFTWARE: "Software",
  EMAIL: "E-mail",
  OTHER: "Outros",
};

export const priorityLabels: Record<TicketPriority, string> = {
  CRITICAL: "Crítica",
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

export const statusLabels: Record<TicketStatus, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  WAITING_ANALYST: "Aguardando analista",
  APPROVED: "Aprovado",
  RESOLVED: "Resolvido",
  CLOSED: "Fechado",
};

export const scopeLabels: Record<AffectedScope, string> = {
  ONLY_ME: "Só eu",
  TEAM: "Minha equipe",
  COMPANY: "A empresa toda",
  UNKNOWN: "Não sei",
};

const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatLocalDateTime(value: Date | string): string {
  return dateTimeFormat.format(typeof value === "string" ? new Date(value) : value);
}
