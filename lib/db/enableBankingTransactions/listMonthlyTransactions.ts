import "server-only";

import type {
  MonthlyTransactionRange,
  MonthlyTransactionSummary
} from "@/definitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { getInternalTransferMatchingRange } from "./internalTransferMatchingRange";
import { getInternalTransferTransactionIds } from "./internalTransfers";
import { mapStoredTransactionToSummary } from "./mapStoredTransaction";
import type {
  StoredMonthlyTransactionRow,
  StoredOwnAccountForTransferMatching
} from "./types";

const MONTHLY_TRANSACTION_SELECT = `
  id,
  account_id,
  booking_status,
  booking_date,
  reporting_date,
  amount,
  currency,
  description,
  merchant_name,
  counterparty_name,
  counterparty_account_last4,
  counterparty_account_fingerprint,
  category_id,
  transaction_categories (
    id,
    name,
    slug,
    transaction_category_groups (
      id,
      name
    )
  ),
  transaction_label_assignments (
    created_at,
    transaction_labels (
      id,
      name
    )
  ),
  accounts!inner (
    id,
    name,
    iban_last4,
    iban_fingerprint,
    bank_connections!inner (
      institutions!inner (
        provider_institution_id,
        name
      )
    )
  )
`;

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
  const [ownAccounts, matchingRows] = await Promise.all([
    listOwnAccountsForTransferMatching(userId),
    listBookingDateCandidates({ userId, rows })
  ]);
  const internalTransferIds = getInternalTransferTransactionIds(
    mergeTransactionRows(rows, matchingRows),
    ownAccounts
  );

  return rows.map((row) =>
    mapStoredTransactionToSummary(
      row,
      internalTransferIds.has(row.id) ? "internal_transfer" : "external"
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

async function listOwnAccountsForTransferMatching(
  userId: string
): Promise<StoredOwnAccountForTransferMatching[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, iban_last4, iban_fingerprint")
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `Could not list accounts for internal transfer matching: ${error.message}`
    );
  }

  return (data ?? []) as StoredOwnAccountForTransferMatching[];
}
