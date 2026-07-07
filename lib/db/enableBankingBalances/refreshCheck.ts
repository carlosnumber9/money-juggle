import type { BankConnectionSummary } from "@/definitions";

export function shouldRefreshConnection(
  connection: BankConnectionSummary,
  maxAgeMs: number
): boolean {
  if (connection.status !== "linked" || connection.accounts.length === 0) {
    return false;
  }

  return connection.accounts.some((account) => {
    if (!account.latest_balance) {
      return true;
    }

    const fetchedAt = new Date(account.latest_balance.fetched_at).getTime();

    return Number.isNaN(fetchedAt) || Date.now() - fetchedAt > maxAgeMs;
  });
}
