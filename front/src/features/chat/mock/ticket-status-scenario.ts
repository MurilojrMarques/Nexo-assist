import type { TicketSummary } from "@/features/tickets/types";
import type { ChatScenario } from "./scenarios";

const openTickets: TicketSummary[] = [
  {
    code: "INC-20311",
    title: "Notebook lento após atualização",
    status: "Aguardando analista",
    openedAt: "2026-10-16T14:20:00-03:00",
  },
  {
    code: "INC-20298",
    title: "Acesso à pasta Financeiro no SharePoint",
    status: "Em andamento",
    openedAt: "2026-10-14T09:05:00-03:00",
  },
  {
    code: "REQ-10442",
    title: "Segundo monitor para home office",
    status: "Aprovado",
    openedAt: "2026-10-09T16:40:00-03:00",
  },
];

export const ticketStatusScenario: ChatScenario = {
  id: "consulta",
  usage: { used: 16, limit: 30 },
  messages: [
    {
      id: "m1",
      role: "user",
      text: "Qual o status do meu chamado?",
    },
    {
      id: "m2",
      role: "agent",
      steps: ["consultou seus chamados"],
      parts: [
        { type: "text", text: "Você tem 3 chamados abertos. Sobre qual deles quer saber?" },
        { type: "ticket-picker", tickets: openTickets, selected: "INC-20311" },
      ],
    },
    {
      id: "m3",
      role: "user",
      text: "INC-20311 · Notebook lento após atualização",
    },
    {
      id: "m4",
      role: "agent",
      steps: ["consultou o INC-20311", "calculou o prazo"],
      parts: [
        {
          type: "ticket-details",
          ticket: {
            code: "INC-20311",
            title: "Notebook lento após atualização do Windows",
            status: "Aguardando analista",
            openedAt: "2026-10-16T14:20:00-03:00",
            description:
              "Lentidão geral desde a atualização de 15/10. Reiniciar e rodar o diagnóstico da central não resolveu.",
            category: "Hardware › Notebook",
            priority: "Média",
            lastUpdate: { relative: "há 5 dias", overdue: true },
          },
        },
        {
          type: "text",
          text: "Está sem atualização há 5 dias, acima do prazo de 3 dias úteis para prioridade média. Quer que eu chame um analista?",
          replies: {
            options: [
              { value: "handoff", label: "Falar com um analista" },
              { value: "add-info", label: "Adicionar informação" },
              { value: "dismiss", label: "Não, obrigado" },
            ],
          },
        },
      ],
    },
  ],
};
