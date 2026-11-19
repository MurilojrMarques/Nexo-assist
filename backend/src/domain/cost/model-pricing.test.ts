import { describe, expect, it } from "vitest";
import { addUsage, NO_USAGE, priceUsage } from "./model-pricing.js";

describe("custo por chamada ao modelo", () => {
  it("cobra entrada, saída e cache pelos preços de cada modelo", () => {
    const usage = priceUsage("claude-sonnet-5-5", {
      inputTokens: 5_000,
      outputTokens: 100,
      cacheReadTokens: 4_000,
      cacheWriteTokens: 0,
    });

    expect(usage.costUsd).toBe(0.0034);
  });

  it("o cache lido sai bem mais barato que a mesma entrada sem cache", () => {
    const tokens = { inputTokens: 5_000, outputTokens: 100, cacheWriteTokens: 0 };
    const cached = priceUsage("claude-sonnet-5-5", { ...tokens, cacheReadTokens: 4_800 });
    const uncached = priceUsage("claude-sonnet-5-5", { ...tokens, cacheReadTokens: 0 });

    expect(cached.costUsd).toBeLessThan(uncached.costUsd / 4);
  });

  it("a primeira escrita no cache custa um pouco mais", () => {
    const written = priceUsage("claude-haiku-5-5", { inputTokens: 1_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 1_000 });
    const plain = priceUsage("claude-haiku-5-5", { inputTokens: 1_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });

    expect(written.costUsd).toBeGreaterThan(plain.costUsd);
  });

  it("soma o uso da triagem com o do agent", () => {
    const triage = priceUsage("claude-haiku-5-5", { inputTokens: 900, outputTokens: 80, cacheReadTokens: 700, cacheWriteTokens: 0 });
    const reply = priceUsage("claude-sonnet-5-5", { inputTokens: 6_000, outputTokens: 120, cacheReadTokens: 4_800, cacheWriteTokens: 0 });

    expect(addUsage(triage, reply)).toEqual({
      inputTokens: 6_900,
      outputTokens: 200,
      cacheReadTokens: 5_500,
      cacheWriteTokens: 0,
      costUsd: 0.004147,
    });
    expect(addUsage()).toEqual(NO_USAGE);
  });
});
