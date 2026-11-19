import type { AuthContext } from "../../modules/auth/auth.types.js";

export function isAnalyst(actor: AuthContext): boolean {
  return actor.role === "ANALYST";
}

export function canReadTicket(actor: AuthContext, ticket: { requesterId: string }): boolean {
  return isAnalyst(actor) || ticket.requesterId === actor.userId;
}

export function canAccessConversation(actor: AuthContext, conversation: { employeeId: string }): boolean {
  return isAnalyst(actor) || conversation.employeeId === actor.userId;
}
