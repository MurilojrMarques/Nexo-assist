import { describe, expect, it } from "vitest";
import { handoffReason, type HandoffSignals } from "./handoff.js";

const calm: HandoffSignals = { employeeAskedForAnalyst: false, priority: "MEDIUM", ticketOverdue: false, confidence: 0.9 };

describe("handoffReason (Anexo A: quando transferir)", () => {
  it("não transfere quando nenhuma condição está presente", () => {
    expect(handoffReason(calm)).toBeNull();
  });

  it.each([
    [{ employeeAskedForAnalyst: true }, "EMPLOYEE_REQUEST"],
    [{ priority: "CRITICAL" as const }, "CRITICAL_ISSUE"],
    [{ ticketOverdue: true }, "OVERDUE_TICKET"],
    [{ confidence: 0.59 }, "LOW_CONFIDENCE"],
  ])("transfere com %j", (signal, reason) => {
    expect(handoffReason({ ...calm, ...signal })).toBe(reason);
  });

  it("aceita confiança exatamente no limite", () => {
    expect(handoffReason({ ...calm, confidence: 0.6 })).toBeNull();
  });

  it("prioriza o pedido do funcionário quando há vários motivos", () => {
    expect(handoffReason({ employeeAskedForAnalyst: true, priority: "CRITICAL", ticketOverdue: true, confidence: 0.1 })).toBe(
      "EMPLOYEE_REQUEST",
    );
  });
});
