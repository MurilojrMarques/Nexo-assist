import type { Priority } from "./priority";
import type { TicketStatus } from "./types";

export type ApiTicketCategory = "ACCESS" | "NETWORK_VPN" | "HARDWARE" | "SOFTWARE" | "EMAIL" | "OTHER";
export type ApiTicketPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ApiTicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_ANALYST" | "APPROVED" | "RESOLVED" | "CLOSED";
export type ApiAffectedScope = "ONLY_ME" | "TEAM" | "COMPANY" | "UNKNOWN";

export const categoryLabels: Record<ApiTicketCategory, string> = {
  ACCESS: "Acesso",
  NETWORK_VPN: "Rede e VPN",
  HARDWARE: "Hardware",
  SOFTWARE: "Software",
  EMAIL: "E-mail",
  OTHER: "Outros",
};

export const priorityLabels: Record<ApiTicketPriority, Priority> = {
  CRITICAL: "Crítica",
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

export const statusLabels: Record<ApiTicketStatus, TicketStatus> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  WAITING_ANALYST: "Aguardando analista",
  APPROVED: "Aprovado",
  RESOLVED: "Resolvido",
  CLOSED: "Fechado",
};

export const scopeLabels: Record<ApiAffectedScope, string> = {
  ONLY_ME: "Somente você",
  TEAM: "Sua equipe",
  COMPANY: "A empresa toda",
  UNKNOWN: "Não informado",
};
