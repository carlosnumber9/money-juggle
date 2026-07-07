import "server-only";

import { getEnableBankingAccountBalances } from "@/lib/enable-banking/client";

import { getErrorMessage } from "../shared/get-error-message";
import { finishBalanceSync } from "./finish-balance-sync";
import { getConnectionForBalanceSync } from "./get-connection";
import { mapBalanceToRow } from "./map-balance-row";
import { getBalanceSyncSkipReason } from "./skip-reason";
import { createSyncRun } from "./sync-runs";
import type {
  BalanceSyncFailure,
  StoredConnectionForBalanceSync
} from "./types";

export async function syncEnableBankingConnectionBalances(input: {
  userId: string;
  bankConnectionId: string;
}) {
  const connection = await getConnectionForBalanceSync(input);

  if (!shouldSyncConnection(connection)) {
    console.info("Balance sync skipped for connection", {
      reason: getBalanceSyncSkipReason(connection),
      bank_connection_id: input.bankConnectionId
    });
    return;
  }

  const syncRunId = await createSyncRun({
    ...input,
    accountCount: connection.accounts.length
  });
  const fetchedAt = new Date().toISOString();
  const rows = [];
  const failures: BalanceSyncFailure[] = [];

  for (const account of connection.accounts) {
    try {
      const balances = await getEnableBankingAccountBalances(
        account.provider_account_id
      );

      rows.push(
        ...balances.map((balance) =>
          mapBalanceToRow({
            userId: input.userId,
            accountId: account.id,
            accountCurrency: account.currency,
            balance,
            fetchedAt
          })
        )
      );
    } catch (error) {
      failures.push({
        account_id: account.id,
        provider_account_id: account.provider_account_id,
        message: getErrorMessage(error)
      });
    }
  }

  await finishBalanceSync({ ...input, syncRunId, fetchedAt, rows, failures });
}

function shouldSyncConnection(
  connection: Awaited<ReturnType<typeof getConnectionForBalanceSync>>
): connection is StoredConnectionForBalanceSync {
  return (
    connection?.status === "linked" &&
    Boolean(connection.provider_session_id) &&
    connection.accounts.length > 0
  );
}
