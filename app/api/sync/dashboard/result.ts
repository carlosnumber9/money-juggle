type BalanceSyncResult = {
  synced: boolean;
  succeededConnectionCount: number;
  failedConnectionCount: number;
  rateLimitedConnectionCount: number;
  cooldownConnectionCount: number;
  cooldownUntil: string | null;
};

type TransactionSyncResult = {
  synced: boolean;
  succeededAccountCount: number;
  failedAccountCount: number;
  rateLimitedAccountCount: number;
  cooldownConnectionCount: number;
  cooldownUntil: string | null;
};

export function getDashboardSyncResult({
  balances,
  transactions
}: {
  balances: BalanceSyncResult;
  transactions: TransactionSyncResult;
}) {
  const failedCount =
    balances.failedConnectionCount + transactions.failedAccountCount;
  const succeededCount =
    balances.succeededConnectionCount + transactions.succeededAccountCount;
  const newlyRateLimitedCount =
    balances.rateLimitedConnectionCount + transactions.rateLimitedAccountCount;
  const cooldownConnectionCount = Math.max(
    balances.cooldownConnectionCount,
    transactions.cooldownConnectionCount
  );
  const rateLimited = newlyRateLimitedCount > 0 || cooldownConnectionCount > 0;

  return {
    status:
      failedCount > 0 && succeededCount === 0
        ? newlyRateLimitedCount === failedCount
          ? 429
          : 500
        : 200,
    body: {
      synced: balances.synced || transactions.synced,
      partialFailure: failedCount > 0 && succeededCount > 0,
      rateLimited,
      cooldownUntil: getLatestTimestamp(
        balances.cooldownUntil,
        transactions.cooldownUntil
      )
    }
  };
}

function getLatestTimestamp(
  left: string | null,
  right: string | null
): string | null {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}
