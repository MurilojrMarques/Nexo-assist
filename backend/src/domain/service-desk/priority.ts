import type { AffectedScope, TicketPriority, TicketType } from "./types.js";

export type PriorityInput = {
  type: TicketType;
  affectedScope: AffectedScope;
  workStopped: boolean;
  deadlineToday: boolean;
};

export type PriorityDecision = {
  priority: TicketPriority;
  rule: string;
};

export function classifyPriority(input: PriorityInput): PriorityDecision {
  const collective = input.affectedScope === "TEAM" || input.affectedScope === "COMPANY";

  if (input.workStopped && collective) {
    return { priority: "CRITICAL", rule: "Algo parado para uma equipe ou para a empresa" };
  }

  if (input.workStopped) {
    return { priority: "HIGH", rule: "Impede uma pessoa de trabalhar" };
  }

  if (input.deadlineToday) {
    return { priority: "HIGH", rule: "Há um compromisso no mesmo dia" };
  }

  if (input.type === "REQUEST") {
    return { priority: "LOW", rule: "Pedido sem urgência" };
  }

  return { priority: "MEDIUM", rule: "Atrapalha, mas há alternativa" };
}
