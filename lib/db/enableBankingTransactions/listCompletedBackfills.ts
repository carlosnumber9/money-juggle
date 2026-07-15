import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

export async function listCompletedTransactionBackfillConnectionIds(
  userId: string
): Promise<Set<string>> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("sync_runs")
    .select("bank_connection_id")
    .eq("user_id", userId)
    .eq("status", "succeeded")
    .eq("metadata->>kind", "transaction_backfill");

  if (error) {
    throw new Error(
      `Could not load completed transaction backfills: ${error.message}`
    );
  }

  return new Set((data ?? []).map((run) => run.bank_connection_id));
}
