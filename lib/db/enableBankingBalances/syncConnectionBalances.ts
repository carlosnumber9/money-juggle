import "server-only";

import { getEnableBankingAccountBalances } from "@/lib/enableBanking/client";

import { getAccountSyncFailure } from "../shared/accountSyncFailure";
import {
  getActiveRateLimitCooldown,
  setConnectionRateLimitCooldown
} from "../enableBankingSync/rateLimitCooldown";
import { finishBalanceSync } from "./finishBalanceSync";
import { getConnectionForBalanceSync } from "./getConnection";
import { mapBalanceToRow } from "./mapBalanceRow";
import { getBalanceSyncSkipReason } from "./skipReason";
import { createSyncRun } from "./syncRuns";
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
    return { status: "skipped" as const };
  }

  const cooldownUntil = getActiveRateLimitCooldown(
    connection.provider_rate_limited_until
  );

  if (cooldownUntil) {
    console.info("Balance sync skipped during provider rate-limit cooldown", {
      bank_connection_id: input.bankConnectionId,
      cooldown_until: cooldownUntil
    });
    return {
      status: "rate-limited" as const,
      cooldownUntil
    };
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
      const failure = getAccountSyncFailure({
        accountId: account.id,
        providerAccountId: account.provider_account_id,
        error
      });
      failures.push(failure);

      if (failure.rate_limited) {
        await setConnectionRateLimitCooldown(input);
        break;
      }
    }
  }

  await finishBalanceSync({ ...input, syncRunId, fetchedAt, rows, failures });
  return { status: "completed" as const };
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
