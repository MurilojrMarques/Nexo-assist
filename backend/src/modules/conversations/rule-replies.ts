import type { DecisionAction, MessagePart, OutOfScopeArea, TriageResult } from "./conversation.types.js";

export type RuleReply = {
  content: string;
  parts: MessagePart[];
  action: DecisionAction;
  rationale: string[];
};

const areaNames: Record<OutOfScopeArea, string> = {
  HR: "o RH",
  FINANCE: "o financeiro",
  FACILITIES: "a equipe de facilities",
  OTHER: "a área responsável",
};

export const GREETING_OPTIONS = ["Estou com um problema", "Quero pedir acesso ou equipamento", "Ver meus chamados"];

export function ruleReply(triage: TriageResult, input: { employeeName: string; firstMessage: boolean }): RuleReply | null {
  if (triage.intent === "OUT_OF_SCOPE" && !triage.itScope) {
    return {
      content: `Esse assunto não é de TI, então não consigo resolver por aqui. Fale com ${areaNames[triage.outOfScopeArea ?? "OTHER"]}. Se tiver algo de TI, me conte.`,
      parts: [],
      action: "OUT_OF_SCOPE",
      rationale: ["Assunto fora de TI: respondido pela regra de escopo, sem chamar o modelo principal."],
    };
  }

  if (triage.intent === "GREETING" && input.firstMessage) {
    const firstName = input.employeeName.split(" ")[0] ?? input.employeeName;
    return {
      content: `Oi, ${firstName}! Em que posso ajudar com TI hoje?`,
      parts: [{ type: "quick-replies", options: GREETING_OPTIONS }],
      action: "ANSWERED",
      rationale: ["Saudação sem pedido: respondida pela regra, sem chamar o modelo principal."],
    };
  }

  return null;
}
