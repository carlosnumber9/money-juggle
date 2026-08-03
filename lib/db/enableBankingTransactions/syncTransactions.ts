import "server-only";

import { getErrorMessage } from "../shared/getErrorMessage";
import { listCompletedTransactionBackfillConnectionIds } from "./listCompletedBackfills";
import { listConnectionsForTransactionSync } from "./listConnections";
import { syncConnectionTransactions } from "./syncConnectionTransactions";
import type { TransactionSyncMode, TransactionSyncResult } from "./types";

export async function syncEnableBankingTransactions({
  userId,
  dateFrom,
  dateTo,
  mode
}: {
  userId: string;
  dateFrom: string;
  dateTo: string;
  mode: TransactionSyncMode;
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
    rateLimitedAccountCount: 0
  };

  for (const connection of connections) {
    if (
      !shouldSyncConnection(connection) ||
      completedBackfillConnectionIds.has(connection.id)
    ) {
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
}
