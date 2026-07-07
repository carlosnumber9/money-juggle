import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

import { finishSyncRun } from "./syncRuns";
import type { BalanceSyncFailure } from "./types";

export async function persistBalances(input: {
  syncRunId: string;
  rows: unknown[];
  failures: BalanceSyncFailure[];
}) {
  if (input.rows.length === 0) {
    return;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from("balances").insert(input.rows);

  if (!error) {
    return;
  }

  await finishSyncRun({
    syncRunId: input.syncRunId,
    status: "failed",
    errorCode: "balance-insert-failed",
    errorMessage: error.message,
    metadata: {
      balance_count: input.rows.length,
      failures: input.failures
    }
  });

  throw new Error(`Could not store balances: ${error.message}`);
}
