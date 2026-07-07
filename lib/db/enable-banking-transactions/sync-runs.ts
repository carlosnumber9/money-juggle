import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export async function createSyncRun({
  userId,
  bankConnectionId,
  accountCount,
  dateFrom,
  dateTo
}: {
  userId: string;
  bankConnectionId: string;
  accountCount: number;
  dateFrom: string;
  dateTo: string;
}): Promise<string> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("sync_runs")
    .insert({
      user_id: userId,
      bank_connection_id: bankConnectionId,
      status: "running",
      metadata: {
        kind: "transactions",
        account_count: accountCount,
        date_from: dateFrom,
        date_to: dateTo
      }
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Could not create transaction sync run: ${error.message}`);
  }

  return data.id;
}

export async function finishSyncRun({
  syncRunId,
  status,
  errorCode,
  errorMessage,
  metadata
}: {
  syncRunId: string;
  status: "succeeded" | "failed" | "partial";
  errorCode?: string;
  errorMessage?: string;
  metadata: Record<string, unknown>;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("sync_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      error_code: errorCode ?? null,
      error_message: errorMessage ?? null,
      metadata: { kind: "transactions", ...metadata }
    })
    .eq("id", syncRunId);

  if (error) {
    throw new Error(`Could not finish transaction sync run: ${error.message}`);
  }
}
