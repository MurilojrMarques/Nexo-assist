import { describe, expect, it } from "vitest";
import { formatDay, formatDayTime } from "./format-date";

describe("format-date", () => {
  it("formata dia e mês abreviado", () => {
    expect(formatDay("2026-10-16T14:20:00-03:00")).toBe("16 out");
    expect(formatDay("2026-01-09T08:00:00-03:00")).toBe("09 jan");
  });

  it("formata dia, mês e hora", () => {
    expect(formatDayTime("2026-10-16T14:20:00-03:00")).toBe("16 out, 14:20");
  });

  it("usa o fuso de São Paulo independentemente do fuso de origem", () => {
    expect(formatDayTime("2026-10-17T01:30:00Z")).toBe("16 out, 22:30");
  });
});
