import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { getRecord } from "../enableBankingConnections/records";

export async function listCompletedTransactionBackfillConnectionIds(
  userId: string
): Promise<Set<string>> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("sync_runs")
    .select("bank_connection_id,started_at,bank_connections(provider_metadata)")
    .eq("user_id", userId)
    .eq("status", "succeeded")
    .eq("metadata->>kind", "transaction_backfill");

  if (error) {
    throw new Error(
      `Could not load completed transaction backfills: ${error.message}`
    );
  }

  return new Set(
    (data ?? [])
      .filter((run) => {
        const connection = Array.isArray(run.bank_connections)
          ? run.bank_connections[0]
          : run.bank_connections;
        const authorizedAt = getRecord(
          connection?.provider_metadata
        ).session_authorized_at;
        return (
          typeof authorizedAt !== "string" ||
          !Number.isFinite(Date.parse(authorizedAt)) ||
          Date.parse(run.started_at) >= Date.parse(authorizedAt)
        );
      })
      .map((run) => run.bank_connection_id)
  );
}
