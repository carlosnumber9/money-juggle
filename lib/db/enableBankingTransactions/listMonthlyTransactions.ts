import "server-only";

import type {
  MonthlyTransactionRange,
  MonthlyTransactionSummary
} from "@/definitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listTransactionReconciliationStates } from "@/lib/db/transactionReconciliations";

import { getInternalTransferMatchingRange } from "./internalTransferMatchingRange";
import { getInternalTransferTransactionIds } from "./internalTransfers";
import { mapStoredTransactionToSummary } from "./mapStoredTransaction";
import {
  listOwnAccountsForTransferMatching,
  MONTHLY_TRANSACTION_SELECT
} from "./transactionReadContext";
import type { StoredMonthlyTransactionRow } from "./types";

export async function listMonthlyTransactions({
  userId,
  range
}: {
  userId: string;
  range: MonthlyTransactionRange;
}): Promise<MonthlyTransactionSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(MONTHLY_TRANSACTION_SELECT)
    .eq("user_id", userId)
    .gte("reporting_date", range.from)
    .lt("reporting_date", range.to)
    .order("reporting_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not list transactions: ${error.message}`);
  }

  const rows = (data ?? []) as StoredMonthlyTransactionRow[];
  const [ownAccounts, matchingRows, reconciliationStates] = await Promise.all([
    listOwnAccountsForTransferMatching(userId),
    listBookingDateCandidates({ userId, rows }),
    listTransactionReconciliationStates({
      userId,
      transactionIds: rows.map((row) => row.id)
    })
  ]);
  const internalTransferIds = getInternalTransferTransactionIds(
    mergeTransactionRows(rows, matchingRows),
    ownAccounts
  );

  return rows.map((row) =>
    mapStoredTransactionToSummary(
      row,
      internalTransferIds.has(row.id) ? "internal_transfer" : "external",
      reconciliationStates.get(row.id) ?? null
    )
  );
}

async function listBookingDateCandidates({
  userId,
  rows
}: {
  userId: string;
  rows: StoredMonthlyTransactionRow[];
}): Promise<StoredMonthlyTransactionRow[]> {
  const range = getInternalTransferMatchingRange(rows);

  if (!range) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(MONTHLY_TRANSACTION_SELECT)
    .eq("user_id", userId)
    .gte("booking_date", range.from)
    .lt("booking_date", range.to);

  if (error) {
    throw new Error(
      `Could not list transaction matching candidates: ${error.message}`
    );
  }

  return (data ?? []) as StoredMonthlyTransactionRow[];
}

function mergeTransactionRows(
  rows: StoredMonthlyTransactionRow[],
  matchingRows: StoredMonthlyTransactionRow[]
): StoredMonthlyTransactionRow[] {
  return [
    ...new Map([...rows, ...matchingRows].map((row) => [row.id, row])).values()
  ];
}
