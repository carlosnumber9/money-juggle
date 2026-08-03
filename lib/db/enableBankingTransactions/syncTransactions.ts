import "server-only";

import { getErrorMessage } from "../shared/getErrorMessage";
import { getActiveRateLimitCooldown } from "../enableBankingSync/rateLimitCooldown";
import { listCompletedTransactionBackfillConnectionIds } from "./listCompletedBackfills";
import { listConnectionsForTransactionSync } from "./listConnections";
import { syncConnectionTransactions } from "./syncConnectionTransactions";
import type { TransactionSyncMode, TransactionSyncResult } from "./types";

export async function syncEnableBankingTransactions({
  userId,
  dateFrom,
  dateTo,
  mode,
  bankConnectionIds
}: {
  userId: string;
  dateFrom: string;
  dateTo: string;
  mode: TransactionSyncMode;
  bankConnectionIds?: ReadonlySet<string>;
}): Promise<TransactionSyncResult> {
  const connections = await listConnectionsForTransactionSync(userId);
  const completedBackfillConnectionIds =
    mode === "backfill"
      ? await listCompletedTransactionBackfillConnectionIds(userId)
      : new Set<string>();
  const result: TransactionSyncResult = {
    synced: false,
    attemptedAccountCount: 0,
    succeededAccountCount: 0,
    failedAccountCount: 0,
    rateLimitedAccountCount: 0,
    cooldownConnectionCount: 0,
    cooldownUntil: null
  };

  for (const connection of connections) {
    if (
      !shouldSyncConnection(connection) ||
      (bankConnectionIds && !bankConnectionIds.has(connection.id)) ||
      completedBackfillConnectionIds.has(connection.id)
    ) {
      continue;
    }

    const cooldownUntil = getActiveRateLimitCooldown(
      connection.provider_rate_limited_until
    );

    if (cooldownUntil) {
      result.cooldownConnectionCount += 1;
      result.cooldownUntil = getLatestTimestamp(
        result.cooldownUntil,
        cooldownUntil
      );
      continue;
    }

    try {
      const connectionResult = await syncConnectionTransactions({
        userId,
        connection,
        dateFrom,
        dateTo,
        mode
      });

      mergeSyncResult(result, connectionResult);
    } catch (error) {
      result.attemptedAccountCount += connection.accounts.length;
      result.failedAccountCount += connection.accounts.length;
      console.error("Enable Banking transaction sync failed", {
        bank_connection_id: connection.id,
        mode,
        message: getErrorMessage(error)
      });
    }
  }

  return result;
}

function shouldSyncConnection(
  connection: Awaited<
    ReturnType<typeof listConnectionsForTransactionSync>
  >[number]
) {
  return (
    connection.status === "linked" &&
    Boolean(connection.provider_session_id) &&
    connection.accounts.length > 0
  );
}

function mergeSyncResult(
  target: TransactionSyncResult,
  source: TransactionSyncResult
) {
  target.synced = target.synced || source.synced;
  target.attemptedAccountCount += source.attemptedAccountCount;
  target.succeededAccountCount += source.succeededAccountCount;
  target.failedAccountCount += source.failedAccountCount;
  target.rateLimitedAccountCount += source.rateLimitedAccountCount;
  target.cooldownConnectionCount += source.cooldownConnectionCount;
  target.cooldownUntil = getLatestTimestamp(
    target.cooldownUntil,
    source.cooldownUntil
  );
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
