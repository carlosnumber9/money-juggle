import "server-only";

import type { EnableBankingPsuHeaders } from "@/definitions";
import { getEnableBankingAccountTransactions } from "@/lib/enableBanking/client";

import { getErrorMessage } from "../shared/getErrorMessage";
import { getAccountFailure } from "./accountFailure";
import { setConnectionRateLimitCooldown } from "../enableBankingSync/rateLimitCooldown";
import { persistRowsAndFinishRun } from "./finishConnectionSync";
import { listConnectionsForTransactionSync } from "./listConnections";
import { mapTransactionToRow } from "./mapTransactionToRow";
import { createSyncRun } from "./syncRuns";
import type {
  StoredConnectionForTransactionSync,
  TransactionRow,
  TransactionSyncMode
} from "./types";

const REPEATED_CONTINUATION_KEY_MESSAGE =
  "Enable Banking returned a repeated transaction continuation key.";

export async function syncConnectionTransactions(input: {
  userId: string;
  connection: StoredConnectionForTransactionSync;
  dateFrom: string;
  dateTo: string;
  mode: TransactionSyncMode;
  psuHeaders?: EnableBankingPsuHeaders;
}) {
  const syncRunId = await createSyncRun({
    userId: input.userId,
    bankConnectionId: input.connection.id,
    accountCount: input.connection.accounts.length,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    mode: input.mode
  });
  const fetchedAt = new Date().toISOString();
  const rows: TransactionRow[] = [];
  const failures = [];
  let attemptedAccountCount = 0;
  let succeededAccountCount = 0;
  let rateLimitedAccountCount = 0;

  for (const account of input.connection.accounts) {
    attemptedAccountCount += 1;

    try {
      const transactionResult = await getEnableBankingAccountTransactions({
        accountId: account.provider_account_id,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        strategy: input.mode === "backfill" ? "longest" : "default",
        psuHeaders: input.psuHeaders
      });

      const accountRows = transactionResult.transactions
        .map((transaction) =>
          mapTransactionToRow({
            userId: input.userId,
            account,
            transaction
          })
        )
        .filter((row): row is TransactionRow => Boolean(row));

      rows.push(...accountRows);

      if (!transactionResult.paginationTruncated) {
        succeededAccountCount += 1;
        continue;
      }

      if (accountRows.length > 0) {
        succeededAccountCount += 1;
      }

      const error = new Error(REPEATED_CONTINUATION_KEY_MESSAGE);

      console.warn("Enable Banking transaction pagination truncated", {
        bank_connection_id: input.connection.id,
        account_id: account.id,
        message: error.message
      });
      failures.push(getAccountFailure(account, error));
    } catch (error) {
      console.error("Enable Banking transaction account fetch failed", {
        bank_connection_id: input.connection.id,
        account_id: account.id,
        message: getErrorMessage(error)
      });
      const failure = getAccountFailure(account, error);
      failures.push(failure);
      if (failure.rate_limited) {
        rateLimitedAccountCount += 1;
        await setConnectionRateLimitCooldown({
          userId: input.userId,
          bankConnectionId: input.connection.id
        });
        break;
      }
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
    failedAccountCount: failures.length,
    rateLimitedAccountCount,
    cooldownConnectionCount: 0,
    cooldownUntil: null,
    freshConnectionCount: 0
  };
}

export { listConnectionsForTransactionSync };
