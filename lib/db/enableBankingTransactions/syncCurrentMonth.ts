import "server-only";

import { getErrorMessage } from "../shared/getErrorMessage";
import { listConnectionsForTransactionSync } from "./listConnections";
import { syncConnectionTransactions } from "./syncConnectionTransactions";
import type { TransactionSyncResult } from "./types";

export async function syncCurrentMonthEnableBankingTransactions({
  userId,
  dateFrom,
  dateTo
}: {
  userId: string;
  dateFrom: string;
  dateTo: string;
}): Promise<TransactionSyncResult> {
  const connections = await listConnectionsForTransactionSync(userId);
  const result: TransactionSyncResult = {
    synced: false,
    attemptedAccountCount: 0,
    succeededAccountCount: 0,
    failedAccountCount: 0
  };

  for (const connection of connections) {
    if (!shouldSyncConnection(connection)) {
      continue;
    }

    try {
      const connectionResult = await syncConnectionTransactions({
        userId,
        connection,
        dateFrom,
        dateTo
      });

      mergeSyncResult(result, connectionResult);
    } catch (error) {
      result.attemptedAccountCount += connection.accounts.length;
      result.failedAccountCount += connection.accounts.length;
      console.error("Enable Banking transaction sync failed", {
        bank_connection_id: connection.id,
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
}
