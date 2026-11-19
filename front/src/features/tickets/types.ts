import type { Priority } from "./priority";

export type TicketStatus =
  | "Aberto"
  | "Aguardando analista"
  | "Em atendimento"
  | "Em andamento"
  | "Aprovado"
  | "Resolvido"
  | "Fechado";

export type TicketSummary = {
  code: string;
  title: string;
  status: TicketStatus;
  openedAt: string;
};

export type TicketDetails = TicketSummary & {
  description: string;
  category: string;
  priority: Priority;
  lastUpdate: {
    relative: string;
    overdue: boolean;
  };
};
