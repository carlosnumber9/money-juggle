import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

import type { TransactionSyncMode } from "./types";

export async function createSyncRun({
  userId,
  bankConnectionId,
  accountCount,
  dateFrom,
  dateTo,
  mode
}: {
  userId: string;
  bankConnectionId: string;
  accountCount: number;
  dateFrom: string;
  dateTo: string;
  mode: TransactionSyncMode;
}): Promise<string> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("sync_runs")
    .insert({
      user_id: userId,
      bank_connection_id: bankConnectionId,
      status: "running",
      metadata: getSyncRunMetadata({
        accountCount,
        dateFrom,
        dateTo,
        mode
      })
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
  accountCount,
  dateFrom,
  dateTo,
  mode,
  metadata
}: {
  syncRunId: string;
  status: "succeeded" | "failed" | "partial";
  errorCode?: string;
  errorMessage?: string;
  accountCount: number;
  dateFrom: string;
  dateTo: string;
  mode: TransactionSyncMode;
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
      metadata: getSyncRunMetadata({
        accountCount,
        dateFrom,
        dateTo,
        mode,
        metadata
      })
    })
    .eq("id", syncRunId);

  if (error) {
    throw new Error(`Could not finish transaction sync run: ${error.message}`);
  }
}

function getSyncRunMetadata({
  accountCount,
  dateFrom,
  dateTo,
  mode,
  metadata = {}
}: {
  accountCount: number;
  dateFrom: string;
  dateTo: string;
  mode: TransactionSyncMode;
  metadata?: Record<string, unknown>;
}) {
  return {
    ...metadata,
    kind: mode === "backfill" ? "transaction_backfill" : "transactions",
    mode,
    account_count: accountCount,
    date_from: dateFrom,
    date_to: dateTo
  };
}
