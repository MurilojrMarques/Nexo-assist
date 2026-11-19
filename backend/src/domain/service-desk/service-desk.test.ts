import { describe, expect, it } from "vitest";
import { classifyPriority } from "./priority.js";
import { computeDueAt } from "./sla.js";
import { findRelatedTickets, formatTicketCode, isOverdue, isReopenable } from "./ticket-rules.js";

const brt = (local: string) => new Date(`${local}-03:00`);

describe("classifyPriority (Anexo A)", () => {
  it.each([
    [{ type: "INCIDENT", affectedScope: "TEAM", workStopped: true, deadlineToday: false }, "CRITICAL"],
    [{ type: "INCIDENT", affectedScope: "COMPANY", workStopped: true, deadlineToday: false }, "CRITICAL"],
    [{ type: "INCIDENT", affectedScope: "ONLY_ME", workStopped: true, deadlineToday: false }, "HIGH"],
    [{ type: "INCIDENT", affectedScope: "ONLY_ME", workStopped: false, deadlineToday: true }, "HIGH"],
    [{ type: "REQUEST", affectedScope: "ONLY_ME", workStopped: false, deadlineToday: true }, "HIGH"],
    [{ type: "INCIDENT", affectedScope: "TEAM", workStopped: false, deadlineToday: false }, "MEDIUM"],
    [{ type: "REQUEST", affectedScope: "ONLY_ME", workStopped: false, deadlineToday: false }, "LOW"],
  ] as const)("%j vira %s", (input, expected) => {
    expect(classifyPriority(input).priority).toBe(expected);
  });

  it("explica a regra aplicada", () => {
    expect(
      classifyPriority({ type: "INCIDENT", affectedScope: "ONLY_ME", workStopped: false, deadlineToday: true }).rule,
    ).toBe("Há um compromisso no mesmo dia");
  });
});

describe("computeDueAt (horário útil: seg a sex, 8h às 18h, Brasília)", () => {
  it.each([
    ["HIGH", "2026-11-16T10:00:00", "2026-11-16T14:00:00"],
    ["HIGH", "2026-11-16T16:00:00", "2026-11-17T10:00:00"],
    ["HIGH", "2026-11-20T17:00:00", "2026-11-23T11:00:00"],
    ["HIGH", "2026-11-21T10:00:00", "2026-11-23T12:00:00"],
    ["HIGH", "2026-11-16T20:00:00", "2026-11-17T12:00:00"],
    ["HIGH", "2026-11-16T06:30:00", "2026-11-16T12:00:00"],
    ["MEDIUM", "2026-11-16T10:00:00", "2026-11-19T10:00:00"],
    ["MEDIUM", "2026-11-20T10:00:00", "2026-11-25T10:00:00"],
    ["MEDIUM", "2026-11-21T09:00:00", "2026-11-26T08:00:00"],
    ["LOW", "2026-11-16T10:00:00", "2026-11-23T10:00:00"],
  ] as const)("%s aberto em %s vence em %s", (priority, from, expected) => {
    expect(computeDueAt(priority, brt(from))).toEqual(brt(expected));
  });

  it("crítico conta 1 hora corrida, inclusive de madrugada e no fim de semana (plantão 24h)", () => {
    expect(computeDueAt("CRITICAL", brt("2026-11-21T03:00:00"))).toEqual(brt("2026-11-21T04:00:00"));
  });
});

describe("regras de chamado", () => {
  const now = brt("2026-11-19T12:00:00");
  const day = 86_400_000;

  it("considera vencido só chamado aberto com prazo no passado", () => {
    expect(isOverdue({ status: "WAITING_ANALYST", dueAt: new Date(now.getTime() - 1) }, now)).toBe(true);
    expect(isOverdue({ status: "WAITING_ANALYST", dueAt: new Date(now.getTime() + 1) }, now)).toBe(false);
    expect(isOverdue({ status: "RESOLVED", dueAt: new Date(now.getTime() - day) }, now)).toBe(false);
    expect(isOverdue({ status: "OPEN", dueAt: null }, now)).toBe(false);
  });

  it("permite reabrir resolvidos há até 7 dias", () => {
    expect(isReopenable({ status: "RESOLVED", resolvedAt: new Date(now.getTime() - 7 * day) }, now)).toBe(true);
    expect(isReopenable({ status: "RESOLVED", resolvedAt: new Date(now.getTime() - 7 * day - 1) }, now)).toBe(false);
    expect(isReopenable({ status: "CLOSED", resolvedAt: new Date(now.getTime() - day) }, now)).toBe(false);
  });

  it("separa chamados abertos e reabríveis da mesma categoria", () => {
    const tickets = [
      { code: "A", category: "ACCESS", status: "OPEN", resolvedAt: null },
      { code: "B", category: "ACCESS", status: "RESOLVED", resolvedAt: new Date(now.getTime() - 2 * day) },
      { code: "C", category: "ACCESS", status: "RESOLVED", resolvedAt: new Date(now.getTime() - 30 * day) },
      { code: "D", category: "HARDWARE", status: "OPEN", resolvedAt: null },
    ] as const;

    const related = findRelatedTickets([...tickets], "ACCESS", now);

    expect(related.open.map((ticket) => ticket.code)).toEqual(["A"]);
    expect(related.reopenable.map((ticket) => ticket.code)).toEqual(["B"]);
  });

  it("formata o código pelo tipo", () => {
    expect(formatTicketCode("INCIDENT", 20321)).toBe("INC-20321");
    expect(formatTicketCode("REQUEST", 512)).toBe("REQ-00512");
  });
});
