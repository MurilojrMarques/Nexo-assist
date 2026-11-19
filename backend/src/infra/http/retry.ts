export type RetryPolicy = {
  maxAttempts: number;
  baseDelayMs: number;
  isRetryable: (error: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
};

const sleepFor = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function backoffDelay(attempt: number, baseDelayMs: number, random: () => number): number {
  return baseDelayMs * 2 ** (attempt - 1) + Math.floor(random() * baseDelayMs);
}

export async function withRetry<T>(operation: (attempt: number) => Promise<T>, policy: RetryPolicy): Promise<T> {
  const sleep = policy.sleep ?? sleepFor;
  const random = policy.random ?? Math.random;

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= policy.maxAttempts || !policy.isRetryable(error)) {
        throw error;
      }

      await sleep(backoffDelay(attempt, policy.baseDelayMs, random));
    }
  }
}
