import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

import type { TransactionRow } from "./types";
import { getReportingDateForSync } from "./reportingDate";

const TRANSACTION_BATCH_SIZE = 100;

export async function persistTransactionRows(
  rows: TransactionRow[],
  fetchedAt: string
) {
  if (rows.length === 0) {
    return;
  }

  const supabase = createSupabaseServiceRoleClient();
  const rowsByUser = groupRowsByUser(deduplicateRows(rows));

  for (const [userId, userRows] of rowsByUser) {
    for (const batch of chunkRows(userRows, TRANSACTION_BATCH_SIZE)) {
      const accountIds = [...new Set(batch.map((row) => row.account_id))];
      const stableImportKeys = [
        ...new Set(batch.map((row) => row.stable_import_key))
      ];
      const { data: existingRows, error: lookupError } = await supabase
        .from("transactions")
        .select("account_id, stable_import_key, first_seen_at, reporting_date")
        .eq("user_id", userId)
        .in("account_id", accountIds)
        .in("stable_import_key", stableImportKeys);

      if (lookupError) {
        throw new Error(
          `Could not lookup transaction batch: ${lookupError.message}`
        );
      }

      const firstSeenByIdentity = new Map(
        (existingRows ?? []).map((row) => [
          getIdentityKey({
            user_id: userId,
            account_id: row.account_id,
            stable_import_key: row.stable_import_key
          }),
          row.first_seen_at
        ])
      );
      const reportingDateByIdentity = new Map(
        (existingRows ?? []).map((row) => [
          getIdentityKey({
            user_id: userId,
            account_id: row.account_id,
            stable_import_key: row.stable_import_key
          }),
          row.reporting_date
        ])
      );
      const { error: upsertError } = await supabase.from("transactions").upsert(
        batch.map((row) => ({
          ...row,
          reporting_date: getReportingDateForSync(
            reportingDateByIdentity.get(getIdentityKey(row)),
            row.booking_date
          ),
          first_seen_at:
            firstSeenByIdentity.get(getIdentityKey(row)) ?? fetchedAt,
          last_seen_at: fetchedAt
        })),
        {
          onConflict: "user_id,account_id,stable_import_key",
          defaultToNull: false
        }
      );

      if (upsertError) {
        throw new Error(
          `Could not persist transaction batch: ${upsertError.message}`
        );
      }
    }
  }
}

function deduplicateRows(rows: TransactionRow[]): TransactionRow[] {
  const rowsByIdentity = new Map<string, TransactionRow>();

  for (const row of rows) {
    rowsByIdentity.set(getIdentityKey(row), row);
  }

  return [...rowsByIdentity.values()];
}

function groupRowsByUser(rows: TransactionRow[]) {
  const rowsByUser = new Map<string, TransactionRow[]>();

  for (const row of rows) {
    const userRows = rowsByUser.get(row.user_id) ?? [];

    userRows.push(row);
    rowsByUser.set(row.user_id, userRows);
  }

  return rowsByUser;
}

function chunkRows(rows: TransactionRow[], size: number): TransactionRow[][] {
  const chunks: TransactionRow[][] = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

function getIdentityKey(
  row: Pick<TransactionRow, "user_id" | "account_id" | "stable_import_key">
): string {
  return JSON.stringify([row.user_id, row.account_id, row.stable_import_key]);
}
