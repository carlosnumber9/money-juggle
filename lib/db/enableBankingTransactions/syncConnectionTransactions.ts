import "server-only";

import { getEnableBankingAccountTransactions } from "@/lib/enableBanking/client";

import { getErrorMessage } from "../shared/getErrorMessage";
import { getAccountFailure } from "./accountFailure";
import { persistRowsAndFinishRun } from "./finishConnectionSync";
import { listConnectionsForTransactionSync } from "./listConnections";
import { mapTransactionToRow } from "./mapTransactionToRow";
import { createSyncRun } from "./syncRuns";
import type {
  StoredConnectionForTransactionSync,
  TransactionRow
} from "./types";

export async function syncConnectionTransactions(input: {
  userId: string;
  connection: StoredConnectionForTransactionSync;
  dateFrom: string;
  dateTo: string;
}) {
  const syncRunId = await createSyncRun({
    userId: input.userId,
    bankConnectionId: input.connection.id,
    accountCount: input.connection.accounts.length,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo
  });
  const fetchedAt = new Date().toISOString();
  const rows: TransactionRow[] = [];
  const failures = [];
  let attemptedAccountCount = 0;
  let succeededAccountCount = 0;

  for (const account of input.connection.accounts) {
    attemptedAccountCount += 1;

    try {
      const transactions = await getEnableBankingAccountTransactions({
        accountId: account.provider_account_id,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo
      });

      rows.push(
        ...transactions
          .map((transaction) =>
            mapTransactionToRow({
              userId: input.userId,
              account,
              transaction
            })
          )
          .filter((row): row is TransactionRow => Boolean(row))
      );
      succeededAccountCount += 1;
    } catch (error) {
      console.error("Enable Banking transaction account fetch failed", {
        bank_connection_id: input.connection.id,
        account_id: account.id,
        message: getErrorMessage(error)
      });
      failures.push(getAccountFailure(account, error));
    }
  }

  await persistRowsAndFinishRun({
    ...input,
    syncRunId,
    fetchedAt,
    rows,
    failures
  });

  return {
    synced: rows.length > 0,
    attemptedAccountCount,
    succeededAccountCount,
    failedAccountCount: failures.length
  };
}

export { listConnectionsForTransactionSync };
