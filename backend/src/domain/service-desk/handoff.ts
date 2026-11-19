import type { TicketPriority } from "./types.js";

export const LOW_CONFIDENCE_THRESHOLD = 0.6;

export type HandoffReason = "EMPLOYEE_REQUEST" | "CRITICAL_ISSUE" | "OVERDUE_TICKET" | "LOW_CONFIDENCE";

export type HandoffSignals = {
  employeeAskedForAnalyst: boolean;
  priority: TicketPriority | null;
  ticketOverdue: boolean;
  confidence: number;
};

export const handoffReasonLabels: Record<HandoffReason, string> = {
  EMPLOYEE_REQUEST: "O funcionário pediu para falar com um analista",
  CRITICAL_ISSUE: "Caso crítico",
  OVERDUE_TICKET: "Chamado com prazo vencido",
  LOW_CONFIDENCE: "O agent não teve segurança para decidir",
};

export function handoffReason(signals: HandoffSignals): HandoffReason | null {
  if (signals.employeeAskedForAnalyst) {
    return "EMPLOYEE_REQUEST";
  }

  if (signals.priority === "CRITICAL") {
    return "CRITICAL_ISSUE";
  }

  if (signals.ticketOverdue) {
    return "OVERDUE_TICKET";
  }

  if (signals.confidence < LOW_CONFIDENCE_THRESHOLD) {
    return "LOW_CONFIDENCE";
  }

  return null;
}
