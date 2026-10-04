import type { ConnectionSyncIssue } from "@/definitions";
import { buildSyncFeedback } from "@/lib/views/syncFeedback";

type BalanceSyncResult = {
  synced: boolean;
  succeededConnectionCount: number;
  failedConnectionCount: number;
  rateLimitedConnectionCount: number;
  cooldownConnectionCount: number;
  cooldownUntil: string | null;
  issues?: ConnectionSyncIssue[];
};

type TransactionSyncResult = {
  synced: boolean;
  succeededAccountCount: number;
  partialAccountCount: number;
  deferredAccountCount?: number;
  completedConnectionIds?: string[];
  issues?: ConnectionSyncIssue[];
  failedAccountCount: number;
  rateLimitedAccountCount: number;
  cooldownConnectionCount: number;
  cooldownUntil: string | null;
};

export function getDashboardSyncResult({
  balances,
  transactions,
  connections = []
}: {
  balances: BalanceSyncResult;
  transactions: TransactionSyncResult;
  connections?: Parameters<typeof buildSyncFeedback>[1];
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
  const feedback = buildSyncFeedback(
    [...(balances.issues ?? []), ...(transactions.issues ?? [])],
    connections
  );
  const hasErrors =
    failedCount > 0 || feedback.some((issue) => issue.kind === "error");
  const incomplete = transactions.partialAccountCount > 0;
  const retryPending =
    rateLimited || (transactions.deferredAccountCount ?? 0) > 0;
  const completedTransactionBanks = [
    ...new Set(
      (transactions.completedConnectionIds ?? [])
        .map((id) => {
          const connection = connections.find(
            (candidate) => candidate.id === id
          );
          return connection?.institution?.name ?? connection?.institution_name;
        })
        .filter((name): name is string => Boolean(name))
    )
  ].filter(
    (name) =>
      !feedback.some(
        (issue) => issue.resource === "transactions" && issue.bankName === name
      )
  );

  return {
    status:
      failedCount > 0 &&
      succeededCount === 0 &&
      transactions.partialAccountCount === 0
        ? newlyRateLimitedCount === failedCount
          ? 429
          : 500
        : 200,
    body: {
      synced: balances.synced || transactions.synced,
      partialFailure: hasErrors || incomplete || retryPending,
      hasErrors,
      incomplete,
      retryPending,
      feedback,
      completedTransactionBanks,
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
