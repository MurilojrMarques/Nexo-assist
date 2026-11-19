import type { HandoffReason } from "../service-desk/handoff.js";
import type { TicketPriority } from "../service-desk/types.js";

export const MESSAGE_LIMIT_PER_CONVERSATION = 30;
export const DRAFT_TTL_MINUTES = 30;

export const conversationStatuses = ["WITH_AGENT", "WAITING_ANALYST", "WITH_ANALYST", "CLOSED"] as const;
export type ConversationStatus = (typeof conversationStatuses)[number];

const allowedTransitions: Record<ConversationStatus, readonly ConversationStatus[]> = {
  WITH_AGENT: ["WAITING_ANALYST", "WITH_ANALYST", "CLOSED"],
  WAITING_ANALYST: ["WITH_ANALYST", "CLOSED"],
  WITH_ANALYST: ["WITH_AGENT", "CLOSED"],
  CLOSED: [],
};

export function canTransition(from: ConversationStatus, to: ConversationStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function statusesThatCanBecome(to: ConversationStatus): ConversationStatus[] {
  return conversationStatuses.filter((from) => canTransition(from, to));
}

export function agentAnswers(status: ConversationStatus): boolean {
  return status === "WITH_AGENT";
}

export function remainingMessages(sentByEmployee: number): number {
  return Math.max(0, MESSAGE_LIMIT_PER_CONVERSATION - sentByEmployee);
}

export function reachedMessageLimit(sentByEmployee: number): boolean {
  return remainingMessages(sentByEmployee) === 0;
}

export function teamForHandoff(reason: HandoffReason, priority: TicketPriority | null): string {
  return reason === "CRITICAL_ISSUE" || priority === "CRITICAL" ? "Suporte N2" : "Suporte N1";
}

export type ConfidenceBand = "HIGH" | "MEDIUM" | "LOW";

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.85) {
    return "HIGH";
  }

  return confidence >= 0.6 ? "MEDIUM" : "LOW";
}

export function draftExpiresAt(now: Date): Date {
  return new Date(now.getTime() + DRAFT_TTL_MINUTES * 60_000);
}
