import type { StoredConnectionForTransactionSync } from "./types";

export const TRANSACTION_AUTO_REFRESH_MS = 6 * 60 * 60 * 1000;

export function shouldRefreshConnectionTransactions({
  connection,
  maxAgeMs,
  now = new Date()
}: {
  connection: Pick<
    StoredConnectionForTransactionSync,
    "last_transaction_synced_at"
  >;
  maxAgeMs: number;
  now?: Date;
}): boolean {
  if (!connection.last_transaction_synced_at) {
    return true;
  }

  const timestamp = new Date(connection.last_transaction_synced_at).getTime();

  return Number.isNaN(timestamp) || now.getTime() - timestamp > maxAgeMs;
}
