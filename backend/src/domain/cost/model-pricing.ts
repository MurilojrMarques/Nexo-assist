export const pricedModels = ["claude-sonnet-5-5", "claude-haiku-5-5"] as const;

export type PricedModel = (typeof pricedModels)[number];

type PricePerMillion = { input: number; output: number; cacheRead: number; cacheWrite: number };

export const modelPrices: Record<PricedModel, PricePerMillion> = {
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
};

export type TokenCount = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export type ModelUsage = TokenCount & { costUsd: number };

export const NO_USAGE: ModelUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0 };

const roundUsd = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

export function priceUsage(model: PricedModel, tokens: TokenCount): ModelUsage {
  const price = modelPrices[model];
  const uncachedInput = Math.max(0, tokens.inputTokens - tokens.cacheReadTokens - tokens.cacheWriteTokens);
  const cost =
    uncachedInput * price.input +
    tokens.cacheReadTokens * price.cacheRead +
    tokens.cacheWriteTokens * price.cacheWrite +
    tokens.outputTokens * price.output;

  return { ...tokens, costUsd: roundUsd(cost / 1_000_000) };
}

export function addUsage(...usages: ModelUsage[]): ModelUsage {
  return usages.reduce(
    (total, usage) => ({
      inputTokens: total.inputTokens + usage.inputTokens,
      outputTokens: total.outputTokens + usage.outputTokens,
      cacheReadTokens: total.cacheReadTokens + usage.cacheReadTokens,
      cacheWriteTokens: total.cacheWriteTokens + usage.cacheWriteTokens,
      costUsd: roundUsd(total.costUsd + usage.costUsd),
    }),
    NO_USAGE,
  );
}
