import type { ChatMessage } from "@/features/chat/types";
import type { SessionUsage } from "@/features/chat/lib/session-usage";
import { newTicketScenario } from "./new-ticket-scenario";
import { ticketStatusScenario } from "./ticket-status-scenario";

export type ChatScenario = {
  id: string;
  usage: SessionUsage;
  messages: ChatMessage[];
};

const scenarios = [newTicketScenario, ticketStatusScenario];

export function getScenario(id: string | string[] | undefined): ChatScenario {
  return scenarios.find((scenario) => scenario.id === id) ?? newTicketScenario;
}
