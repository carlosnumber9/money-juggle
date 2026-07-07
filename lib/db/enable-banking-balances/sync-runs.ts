import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export async function createSyncRun({
  userId,
  bankConnectionId,
  accountCount
}: {
  userId: string;
  bankConnectionId: string;
  accountCount: number;
}): Promise<string> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("sync_runs")
    .insert({
      user_id: userId,
      bank_connection_id: bankConnectionId,
      status: "running",
      metadata: {
        kind: "balances",
        account_count: accountCount
      }
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Could not create balance sync run: ${error.message}`);
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
      metadata: { kind: "balances", ...metadata }
    })
    .eq("id", syncRunId);

  if (error) {
    throw new Error(`Could not finish balance sync run: ${error.message}`);
  }
}
