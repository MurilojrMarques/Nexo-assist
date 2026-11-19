import { describe, expect, it } from "vitest";
import {
  agentAnswers,
  canTransition,
  confidenceBand,
  draftExpiresAt,
  reachedMessageLimit,
  remainingMessages,
  statusesThatCanBecome,
  teamForHandoff,
} from "./conversation-rules.js";

describe("regras da conversa", () => {
  it("só o agent responde enquanto a conversa está com ele", () => {
    expect(agentAnswers("WITH_AGENT")).toBe(true);
    expect(agentAnswers("WAITING_ANALYST")).toBe(false);
    expect(agentAnswers("WITH_ANALYST")).toBe(false);
    expect(agentAnswers("CLOSED")).toBe(false);
  });

  it.each([
    ["WITH_AGENT", "WAITING_ANALYST", true],
    ["WAITING_ANALYST", "WITH_ANALYST", true],
    ["WITH_ANALYST", "WITH_AGENT", true],
    ["WAITING_ANALYST", "WITH_AGENT", false],
    ["CLOSED", "WITH_AGENT", false],
    ["CLOSED", "WITH_ANALYST", false],
  ] as const)("transição %s → %s permitida: %s", (from, to, allowed) => {
    expect(canTransition(from, to)).toBe(allowed);
  });

  it("lista de onde se pode chegar a cada estado", () => {
    expect(statusesThatCanBecome("WITH_ANALYST")).toEqual(["WITH_AGENT", "WAITING_ANALYST"]);
    expect(statusesThatCanBecome("CLOSED")).toEqual(["WITH_AGENT", "WAITING_ANALYST", "WITH_ANALYST"]);
  });

  it("limita a 30 mensagens do funcionário por conversa", () => {
    expect(remainingMessages(0)).toBe(30);
    expect(remainingMessages(29)).toBe(1);
    expect(reachedMessageLimit(29)).toBe(false);
    expect(reachedMessageLimit(30)).toBe(true);
    expect(remainingMessages(31)).toBe(0);
  });

  it("manda casos críticos para o N2 e o resto para o N1", () => {
    expect(teamForHandoff("CRITICAL_ISSUE", "CRITICAL")).toBe("Suporte N2");
    expect(teamForHandoff("EMPLOYEE_REQUEST", "CRITICAL")).toBe("Suporte N2");
    expect(teamForHandoff("OVERDUE_TICKET", "MEDIUM")).toBe("Suporte N1");
    expect(teamForHandoff("LOW_CONFIDENCE", null)).toBe("Suporte N1");
  });

  it("traduz confiança em faixas", () => {
    expect(confidenceBand(0.9)).toBe("HIGH");
    expect(confidenceBand(0.85)).toBe("HIGH");
    expect(confidenceBand(0.6)).toBe("MEDIUM");
    expect(confidenceBand(0.59)).toBe("LOW");
  });

  it("rascunho vale por 30 minutos", () => {
    expect(draftExpiresAt(new Date("2026-11-19T12:00:00Z"))).toEqual(new Date("2026-11-19T12:30:00Z"));
  });
});
