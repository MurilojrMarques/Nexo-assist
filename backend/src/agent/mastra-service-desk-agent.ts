import { Agent } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import { z } from "zod";
import { priceUsage, type PricedModel, type TokenCount } from "../domain/cost/model-pricing.js";
import type { Logger } from "../infra/logging/logger.js";
import { AppError } from "../shared/errors/app-error.js";
import { ServiceUnavailableError } from "../shared/errors/http-errors.js";
import type { Clock } from "../shared/time/clock.js";
import {
  outOfScopeAreas,
  triageIntents,
  type AgentEvent,
  type AgentReply,
  type DecisionAction,
  type DecisionStep,
  type HistoryMessage,
  type MessagePart,
  type ServiceDeskAgent,
  type TriageInput,
  type TriageResult,
  type TurnContext,
} from "../modules/conversations/conversation.types.js";
import { SERVICE_DESK_INSTRUCTIONS, TRIAGE_INSTRUCTIONS, triagePrompt, turnSystemMessage } from "./instructions.js";
import { ReplyComposer } from "./reply-text.js";
import type { ActionOutcome, ServiceDeskActions } from "./service-desk-actions.js";
import { createServiceDeskTools, visibleSteps, type ServiceDeskToolName } from "./service-desk-tools.js";

export type MastraAgentSettings = {
  apiKey: string;
  agentModel: PricedModel;
  triageModel: PricedModel;
  maxSteps: number;
  maxOutputTokens: number;
};

const TRIAGE_MAX_OUTPUT_TOKENS = 400;

const triageSchema = z.object({
  intent: z.enum(triageIntents),
  understanding: z.string(),
  itScope: z.boolean(),
  outOfScopeArea: z.enum(outOfScopeAreas).nullable(),
  employeeAskedForAnalyst: z.boolean(),
  confidence: z.number(),
  caseSummary: z.string(),
});

const cachedPrefix = { anthropic: { cacheControl: { type: "ephemeral" as const } } };

const assistantOptions = { anthropic: { effort: "low" as const, thinking: { type: "between_tools" as const } } };

const triageOptions = { anthropic: { effort: "low" as const, thinking: { type: "disabled" as const } } };

const lookupTools = new Set<ServiceDeskToolName>(["searchHelpCenter", "listMyTickets", "getTicket"]);

const closingTools = new Set<string>(["offerQuickReplies"]);

type StepSnapshot = { toolCalls?: Array<{ toolName?: string; payload?: { toolName?: string } }> };

export function endsTurn(steps: StepSnapshot[], maxSteps: number): boolean {
  const last = steps.at(-1);
  const closed = (last?.toolCalls ?? []).some((call) => closingTools.has(call.toolName ?? call.payload?.toolName ?? ""));
  return closed || steps.length >= maxSteps;
}

type ToolCallState = { name: ServiceDeskToolName; args: Record<string, unknown>; startedAt: number };

function isActionOutcome(value: unknown): value is ActionOutcome {
  return typeof value === "object" && value !== null && "detail" in value && "model" in value;
}

function readTokens(value: unknown): TokenCount {
  const usage = (value ?? {}) as Record<string, unknown>;
  const count = (key: string) => {
    const amount = usage[key];
    return typeof amount === "number" ? amount : 0;
  };

  return {
    inputTokens: count("inputTokens"),
    outputTokens: count("outputTokens"),
    cacheReadTokens: count("cachedInputTokens"),
    cacheWriteTokens: count("cacheCreationInputTokens"),
  };
}

function sumTokens(total: TokenCount, step: TokenCount): TokenCount {
  return {
    inputTokens: total.inputTokens + step.inputTokens,
    outputTokens: total.outputTokens + step.outputTokens,
    cacheReadTokens: total.cacheReadTokens + step.cacheReadTokens,
    cacheWriteTokens: total.cacheWriteTokens + step.cacheWriteTokens,
  };
}

function toModelMessages(history: HistoryMessage[]) {
  const firstEmployee = history.findIndex((message) => message.author === "EMPLOYEE");

  return history.slice(Math.max(firstEmployee, 0)).map((message) =>
    message.author === "EMPLOYEE"
      ? { role: "user" as const, content: message.content }
      : { role: "assistant" as const, content: message.author === "ANALYST" ? `[Analista] ${message.content}` : message.content },
  );
}

function actionFor(parts: MessagePart[], context: TurnContext): DecisionAction {
  const has = (type: MessagePart["type"]) => parts.some((part) => part.type === type);

  if (has("draft")) {
    return "PROPOSED_DRAFT";
  }

  if (has("ticket-picker")) {
    return "ASKED_TO_PICK_TICKET";
  }

  if (!context.triage.itScope || context.triage.intent === "OUT_OF_SCOPE") {
    return "OUT_OF_SCOPE";
  }

  if (has("articles")) {
    return "ANSWERED_WITH_ARTICLE";
  }

  return has("tickets") ? "LISTED_TICKETS" : "ANSWERED";
}

function clamp(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export class MastraServiceDeskAgent implements ServiceDeskAgent {
  private readonly assistant: Agent;
  private readonly triager: Agent;

  constructor(
    private readonly settings: MastraAgentSettings,
    actions: ServiceDeskActions,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {
    const model = (modelId: PricedModel) => ({ id: `anthropic/${modelId}` as const, apiKey: settings.apiKey });

    this.assistant = new Agent({
      id: "nexo-service-desk",
      name: "Nexo Service Desk",
      instructions: [{ role: "system", content: SERVICE_DESK_INSTRUCTIONS, providerOptions: cachedPrefix }],
      model: model(settings.agentModel),
      tools: createServiceDeskTools(actions),
    });
    this.triager = new Agent({
      id: "nexo-triage",
      name: "Nexo Triagem",
      instructions: [{ role: "system", content: TRIAGE_INSTRUCTIONS, providerOptions: cachedPrefix }],
      model: model(settings.triageModel),
    });
  }

  async triage(input: TriageInput): Promise<TriageResult> {
    try {
      const result = await this.triager.generate(triagePrompt(input.history, input.pendingDraft), {
        structuredOutput: { schema: triageSchema },
        modelSettings: { maxOutputTokens: TRIAGE_MAX_OUTPUT_TOKENS },
        providerOptions: triageOptions,
      });
      const triage = triageSchema.parse(result.object);

      return {
        ...triage,
        outOfScopeArea: triage.itScope ? null : triage.outOfScopeArea,
        confidence: clamp(triage.confidence),
        usage: priceUsage(this.settings.triageModel, readTokens(result.usage)),
        model: this.settings.triageModel,
      };
    } catch (error) {
      throw this.unavailable(error, "triagem");
    }
  }

  async reply(context: TurnContext, emit: (event: AgentEvent) => void): Promise<AgentReply> {
    const requestContext = new RequestContext();
    requestContext.set("employeeId", context.employeeId);
    requestContext.set("conversationId", context.conversationId);

    const calls = new Map<string, ToolCallState>();
    const parts: MessagePart[] = [];
    const steps: DecisionStep[] = [];
    const rationale: string[] = [];
    const composer = new ReplyComposer((delta) => emit({ type: "text", delta }));
    let tokens: TokenCount = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
    let focusTicketCode: string | null = null;
    let overdueTicket: AgentReply["overdueTicket"] = null;

    try {
      const stream = await this.assistant.stream(toModelMessages(context.history), {
        requestContext,
        maxSteps: this.settings.maxSteps,
        stopWhen: ({ steps }: { steps: StepSnapshot[] }) => endsTurn(steps, this.settings.maxSteps),
        system: turnSystemMessage(context, this.clock.now()),
        modelSettings: { maxOutputTokens: this.settings.maxOutputTokens },
        providerOptions: assistantOptions,
      });

      for await (const chunk of stream.fullStream) {
        switch (chunk.type) {
          case "text-delta": {
            composer.delta(chunk.payload.text);
            break;
          }
          case "tool-call": {
            const name = chunk.payload.toolName as ServiceDeskToolName;
            const args = (chunk.payload.args ?? {}) as Record<string, unknown>;
            calls.set(chunk.payload.toolCallId, { name, args, startedAt: Date.now() });
            composer.toolCalled(lookupTools.has(name));
            const label = visibleSteps[name]?.(args);

            if (label) {
              emit({ type: "step", step: { id: chunk.payload.toolCallId, label, status: "running" } });
            }
            break;
          }
          case "tool-result": {
            const call = calls.get(chunk.payload.toolCallId);
            const outcome: unknown = chunk.payload.result;
            const ok = !chunk.payload.isError && isActionOutcome(outcome);

            if (ok) {
              if (outcome.part) {
                parts.push(outcome.part);
              }
              rationale.push(...(outcome.rationale ?? []));
              focusTicketCode = outcome.focusTicketCode ?? focusTicketCode;
              overdueTicket = outcome.overdueTicket ?? overdueTicket;
            }

            this.recordStep(call, chunk.payload.toolCallId, ok, ok ? outcome.detail : "A ferramenta falhou", steps, emit);
            break;
          }
          case "tool-error": {
            this.recordStep(calls.get(chunk.payload.toolCallId), chunk.payload.toolCallId, false, "A ferramenta falhou", steps, emit);
            this.logger.warn({ err: chunk.payload.error, tool: chunk.payload.toolName }, "Tool do agent falhou");
            break;
          }
          case "step-finish": {
            tokens = sumTokens(tokens, readTokens((chunk.payload.output as { usage?: unknown } | undefined)?.usage));
            composer.stepFinished();
            break;
          }
          case "error": {
            throw chunk.payload.error instanceof Error ? chunk.payload.error : new Error("Falha no stream do agent");
          }
          default:
            break;
        }
      }
    } catch (error) {
      throw this.unavailable(error, "resposta");
    }

    const text = composer.finish();
    const action = actionFor(parts, context);

    if (action === "OUT_OF_SCOPE") {
      rationale.push("O service desk atende só TI: indiquei procurar a área responsável, sem abrir chamado.");
    }

    return {
      text: text || "Veja abaixo.",
      parts,
      steps,
      action,
      rationale,
      focusTicketCode,
      overdueTicket,
      usage: priceUsage(this.settings.agentModel, tokens),
      model: this.settings.agentModel,
    };
  }

  private recordStep(
    call: ToolCallState | undefined,
    id: string,
    ok: boolean,
    detail: string,
    steps: DecisionStep[],
    emit: (event: AgentEvent) => void,
  ): void {
    if (!call) {
      return;
    }

    const label = visibleSteps[call.name]?.(call.args);

    if (!label) {
      return;
    }

    steps.push({ tool: call.name, label, ok, durationMs: Date.now() - call.startedAt, detail });
    emit({ type: "step", step: { id, label, status: ok ? "ok" : "error" } });
  }

  private unavailable(error: unknown, stage: string): AppError {
    if (error instanceof AppError) {
      return error;
    }

    this.logger.error({ err: error, stage }, "Falha ao chamar o modelo");
    return new ServiceUnavailableError("O assistente está indisponível agora. Tente de novo em instantes.", "AGENT_UNAVAILABLE");
  }
}

export class UnavailableServiceDeskAgent implements ServiceDeskAgent {
  async triage(): Promise<TriageResult> {
    throw this.error();
  }

  async reply(): Promise<AgentReply> {
    throw this.error();
  }

  private error(): AppError {
    return new ServiceUnavailableError(
      "O assistente não está configurado neste ambiente. Defina ANTHROPIC_API_KEY para ativá-lo.",
      "AGENT_UNAVAILABLE",
    );
  }
}
