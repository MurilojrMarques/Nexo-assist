import { describe, expect, it } from "vitest";
import { formatClock, formatDay, formatDayTime, formatRelative } from "./format-date";

describe("format-date", () => {
  it("formata dia e mês abreviado", () => {
    expect(formatDay("2026-10-16T14:20:00-03:00")).toBe("16 out");
    expect(formatDay("2026-01-09T08:00:00-03:00")).toBe("09 jan");
  });

  it("formata dia, mês e hora", () => {
    expect(formatDayTime("2026-10-16T14:20:00-03:00")).toBe("16 out, 14:20");
  });

  it("formata só a hora de um instante", () => {
    expect(formatClock(new Date("2026-10-21T13:12:00Z"))).toBe("10:12");
  });

  it("usa o fuso de São Paulo independentemente do fuso de origem", () => {
    expect(formatDayTime("2026-10-17T01:30:00Z")).toBe("16 out, 22:30");
  });

  it("descreve há quanto tempo algo aconteceu", () => {
    const now = new Date("2026-11-19T12:00:00Z");

    expect(formatRelative("2026-11-14T12:00:00Z", now)).toBe("há 5 dias");
    expect(formatRelative("2026-11-19T09:00:00Z", now)).toBe("há 3 horas");
    expect(formatRelative("2026-11-19T11:59:40Z", now)).toBe("agora");
  });
});
