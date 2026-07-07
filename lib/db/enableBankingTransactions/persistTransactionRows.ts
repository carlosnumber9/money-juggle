import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

import type { TransactionRow } from "./types";

export async function persistTransactionRows(
  rows: TransactionRow[],
  fetchedAt: string
) {
  if (rows.length === 0) {
    return;
  }

  const supabase = createSupabaseServiceRoleClient();

  for (const row of rows) {
    const { data: existing, error: lookupError } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", row.user_id)
      .eq("account_id", row.account_id)
      .eq("stable_import_key", row.stable_import_key)
      .maybeSingle();

    if (lookupError) {
      throw new Error(`Could not lookup transaction: ${lookupError.message}`);
    }

    if (existing) {
      await updateTransaction(row, existing, fetchedAt);
      continue;
    }

    await insertTransaction(row, fetchedAt);
  }
}

async function updateTransaction(
  row: TransactionRow,
  existing: { id: string },
  fetchedAt: string
) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("transactions")
    .update({
      ...row,
      last_seen_at: fetchedAt
    })
    .eq("id", existing.id)
    .eq("user_id", row.user_id);

  if (error) {
    throw new Error(`Could not update transaction: ${error.message}`);
  }
}

async function insertTransaction(row: TransactionRow, fetchedAt: string) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from("transactions").insert({
    ...row,
    first_seen_at: fetchedAt,
    last_seen_at: fetchedAt
  });

  if (error) {
    throw new Error(`Could not insert transaction: ${error.message}`);
  }
}
