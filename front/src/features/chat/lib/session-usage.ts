export const SESSION_MESSAGE_LIMIT = 30;

export type SessionUsage = {
  used: number;
  limit: number;
};

export function isLimitReached({ used, limit }: SessionUsage): boolean {
  return used >= limit;
}

export function formatUsage({ used, limit }: SessionUsage): string {
  return `${used}/${limit} mensagens nesta sessão`;
}
