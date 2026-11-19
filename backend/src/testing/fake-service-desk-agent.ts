import type {
  AgentEvent,
  AgentReply,
  ServiceDeskAgent,
  TriageInput,
  TriageResult,
  TurnContext,
} from "../modules/conversations/conversation.types.js";

export const calmTriage: TriageResult = {
  intent: "REPORT_PROBLEM",
  understanding: "Seu notebook está lento.",
  itScope: true,
  confidence: 0.9,
  employeeAskedForAnalyst: false,
  caseSummary: "Funcionária relata lentidão no notebook.",
  outOfScopeArea: null,
  usage: { inputTokens: 300, outputTokens: 60, cacheReadTokens: 200, cacheWriteTokens: 0, costUsd: 0.000042 },
  model: "triagem-falsa",
};

export const plainReply: AgentReply = {
  text: "Entendi. Vamos ver isso.",
  parts: [],
  steps: [],
  action: "ANSWERED",
  rationale: [],
  focusTicketCode: null,
  overdueTicket: null,
  usage: { inputTokens: 1200, outputTokens: 150, cacheReadTokens: 1000, cacheWriteTokens: 0, costUsd: 0.0021 },
  model: "agent-falso",
};

export class FakeServiceDeskAgent implements ServiceDeskAgent {
  nextTriage: TriageResult = calmTriage;
  replyWith: (context: TurnContext) => Promise<AgentReply> | AgentReply = () => plainReply;
  readonly triageInputs: TriageInput[] = [];
  readonly replyContexts: TurnContext[] = [];

  async triage(input: TriageInput): Promise<TriageResult> {
    this.triageInputs.push(input);
    return this.nextTriage;
  }

  async reply(context: TurnContext, emit: (event: AgentEvent) => void): Promise<AgentReply> {
    this.replyContexts.push(context);
    const reply = await this.replyWith(context);
    emit({ type: "text", delta: reply.text });
    return reply;
  }
}
