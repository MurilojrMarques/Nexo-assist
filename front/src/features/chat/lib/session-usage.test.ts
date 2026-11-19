import { describe, expect, it } from "vitest";
import { formatUsage, isLimitReached } from "./session-usage";

describe("session-usage", () => {
  it("formata o contador de mensagens", () => {
    expect(formatUsage({ used: 18, limit: 30 })).toBe("18/30 mensagens nesta sessão");
  });

  it.each([
    [29, false],
    [30, true],
    [31, true],
  ])("com %i de 30 mensagens o limite atingido é %s", (used, expected) => {
    expect(isLimitReached({ used, limit: 30 })).toBe(expected);
  });
});
