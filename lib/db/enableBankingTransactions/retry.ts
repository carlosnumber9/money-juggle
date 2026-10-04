export const TRANSACTION_RETRY_DELAY_MS = 15 * 60 * 1000;

export function getTransactionRetryUntil(fetchedAt: string): string {
  return new Date(
    Date.parse(fetchedAt) + TRANSACTION_RETRY_DELAY_MS
  ).toISOString();
}

export function isTransactionRetryDeferred(
  retryUntil: string | null | undefined,
  now = new Date()
): boolean {
  return Boolean(retryUntil && Date.parse(retryUntil) > now.getTime());
}
