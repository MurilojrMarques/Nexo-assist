import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { affectedScopes, ticketCategories, ticketTypes } from "../domain/service-desk/types.js";
import type { ActionOutcome, ServiceDeskActions, TrustedContext } from "./service-desk-actions.js";

type ToolContext = { requestContext?: { get(key: string): unknown } };

const ticketCode = z.string().regex(/^(INC|REQ)-\d{5,}$/, "Use o formato INC-12345 ou REQ-12345.");

export function trustedContext(context: ToolContext | undefined): TrustedContext {
  const employeeId = context?.requestContext?.get("employeeId");
  const conversationId = context?.requestContext?.get("conversationId");

  if (typeof employeeId !== "string" || typeof conversationId !== "string") {
    throw new Error("Contexto da conversa ausente.");
  }

  return { employeeId, conversationId };
}

const forModel = (outcome: unknown) => ({ type: "json" as const, value: (outcome as ActionOutcome).model as never });

export function createServiceDeskTools(actions: ServiceDeskActions) {
  return {
    searchHelpCenter: createTool({
      id: "searchHelpCenter",
      description: "Busca artigos da central de ajuda de TI. Use antes de propor um chamado.",
      inputSchema: z.object({ query: z.string().min(2).max(300).describe("O problema ou a dúvida, com as palavras-chave") }),
      execute: async ({ query }) => actions.searchHelpCenter(query),
      toModelOutput: forModel,
    }),
    listMyTickets: createTool({
      id: "listMyTickets",
      description: "Lista os chamados do funcionário desta conversa.",
      inputSchema: z.object({ status: z.enum(["open", "all"]).describe("open: só os em aberto; all: inclui resolvidos") }),
      execute: async ({ status }, context) => actions.listMyTickets(trustedContext(context), status),
      toModelOutput: forModel,
    }),
    getTicket: createTool({
      id: "getTicket",
      description: "Consulta um chamado do funcionário pelo código.",
      inputSchema: z.object({ code: ticketCode }),
      execute: async ({ code }, context) => actions.getTicket(trustedContext(context), code),
      toModelOutput: forModel,
    }),
    askToPickTicket: createTool({
      id: "askToPickTicket",
      description: "Mostra um seletor para o funcionário escolher um dos próprios chamados.",
      inputSchema: z.object({
        question: z.string().min(5).max(200),
        codes: z.array(ticketCode).min(1).max(6),
      }),
      execute: async ({ question, codes }, context) => actions.askToPickTicket(trustedContext(context), question, codes),
      toModelOutput: forModel,
    }),
    proposeNewTicket: createTool({
      id: "proposeNewTicket",
      description:
        "Mostra um rascunho de chamado novo para o funcionário confirmar. Não cria nada. Verifica duplicidade e calcula a prioridade.",
      inputSchema: z.object({
        type: z.enum(ticketTypes),
        category: z.enum(ticketCategories),
        title: z.string().min(5).max(120),
        description: z.string().min(10).max(2000),
        affectedScope: z.enum(affectedScopes),
        workStopped: z.boolean().describe("O problema impede alguém de trabalhar"),
        deadlineToday: z.boolean().describe("Há um compromisso hoje que depende disso"),
        notDuplicateOf: z
          .array(ticketCode)
          .max(10)
          .default([])
          .describe("Códigos que o funcionário confirmou serem outro problema"),
      }),
      execute: async (input, context) => actions.proposeNewTicket(trustedContext(context), input),
      toModelOutput: forModel,
    }),
    proposeTicketUpdate: createTool({
      id: "proposeTicketUpdate",
      description:
        "Mostra um rascunho para complementar um chamado aberto ou reabrir um resolvido há até 7 dias. Não altera nada até a confirmação.",
      inputSchema: z.object({
        code: ticketCode,
        message: z.string().min(5).max(2000).describe("O complemento ou o motivo da reabertura, nas palavras do funcionário"),
      }),
      execute: async ({ code, message }, context) => actions.proposeTicketUpdate(trustedContext(context), code, message),
      toModelOutput: forModel,
    }),
    offerQuickReplies: createTool({
      id: "offerQuickReplies",
      description: "Mostra botões de resposta rápida abaixo da sua mensagem. Em question, repita a pergunta que você fez ao funcionário.",
      inputSchema: z.object({
        question: z.string().min(1).max(160),
        options: z.array(z.string().min(1).max(40)).min(2).max(4),
      }),
      execute: async ({ question, options }) => actions.offerQuickReplies(question, options),
      toModelOutput: forModel,
    }),
  };
}

export type ServiceDeskToolName = keyof ReturnType<typeof createServiceDeskTools>;

export const visibleSteps: Record<ServiceDeskToolName, ((args: Record<string, unknown>) => string) | null> = {
  searchHelpCenter: () => "Consultei a central de ajuda",
  listMyTickets: () => "Consultei seus chamados",
  getTicket: (args) => `Consultei o chamado ${String(args.code ?? "")}`.trim(),
  askToPickTicket: () => "Separei seus chamados para você escolher",
  proposeNewTicket: () => "Preparei o rascunho do chamado",
  proposeTicketUpdate: (args) => `Preparei a atualização do ${String(args.code ?? "chamado")}`,
  offerQuickReplies: null,
};
