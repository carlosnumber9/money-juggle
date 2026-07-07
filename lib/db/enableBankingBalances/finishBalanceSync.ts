import "server-only";

import { persistBalances } from "./persistBalances";
import { finishSyncRun } from "./syncRuns";
import { updateBalanceSyncTimestamp } from "./updateSyncTimestamp";
import type { BalanceSyncFailure } from "./types";

export async function finishBalanceSync(input: {
  userId: string;
  bankConnectionId: string;
  syncRunId: string;
  fetchedAt: string;
  rows: unknown[];
  failures: BalanceSyncFailure[];
}) {
  await persistBalances(input);
  await finishSyncRun({
    syncRunId: input.syncRunId,
    status: input.failures.length > 0 ? "partial" : "succeeded",
    metadata: {
      balance_count: input.rows.length,
      failures: input.failures
    }
  });

  if (input.rows.length > 0) {
    await updateBalanceSyncTimestamp(input);
  }

  if (input.failures.length > 0 && input.rows.length === 0) {
    throw new Error("Could not fetch balances for any linked account.");
  }
}
