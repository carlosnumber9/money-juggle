import "server-only";

import type { EnableBankingPsuHeaders } from "@/definitions";
import { getEnableBankingAccountTransactions } from "@/lib/enableBanking/client";

import { getErrorMessage } from "../shared/getErrorMessage";
import { getAccountFailure } from "./accountFailure";
import { invalidateConnectionSession } from "../enableBankingSync/invalidSession";
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
  const warnings = [];
  let attemptedAccountCount = 0;
  let succeededAccountCount = 0;
  let partialAccountCount = 0;
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

      partialAccountCount += 1;

      const error =
        transactionResult.pageError ??
        new Error(
          transactionResult.paginationTruncationReason === "page-limit"
            ? "Enable Banking transaction pagination reached the request limit."
            : REPEATED_CONTINUATION_KEY_MESSAGE
        );

      const warning = getAccountFailure(account, error);
      console.warn("Enable Banking transaction pagination truncated", {
        bank_connection_id: input.connection.id,
        account_id: account.id,
        message: warning.message,
        http_status: warning.http_status,
        provider_error: warning.provider_error
      });
      warnings.push(warning);
      if (
        await invalidateConnectionSession({
          userId: input.userId,
          bankConnectionId: input.connection.id,
          providerSessionId: input.connection.provider_session_id,
          providerError: warning.provider_error
        })
      )
        break;
      if (warning.rate_limited) {
        rateLimitedAccountCount += 1;
        await setConnectionRateLimitCooldown({
          userId: input.userId,
          bankConnectionId: input.connection.id
        });
        break;
      }
    } catch (error) {
      const failure = getAccountFailure(account, error);
      console.error("Enable Banking transaction account fetch failed", {
        bank_connection_id: input.connection.id,
        account_id: account.id,
        message: getErrorMessage(error),
        http_status: failure.http_status,
        provider_error: failure.provider_error
      });
      failures.push(failure);
      if (
        await invalidateConnectionSession({
          userId: input.userId,
          bankConnectionId: input.connection.id,
          providerSessionId: input.connection.provider_session_id,
          providerError: failure.provider_error
        })
      ) {
        break;
      }
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
    failures,
    warnings
  });

  return {
    synced: rows.length > 0,
    attemptedAccountCount,
    succeededAccountCount,
    partialAccountCount,
    failedAccountCount: failures.length,
    rateLimitedAccountCount,
    cooldownConnectionCount: 0,
    cooldownUntil: null,
    freshConnectionCount: 0
  };
}

export { listConnectionsForTransactionSync };
