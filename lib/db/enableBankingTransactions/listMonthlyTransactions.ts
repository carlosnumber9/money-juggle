import "server-only";

import type {
  MonthlyTransactionRange,
  MonthlyTransactionSummary
} from "@/definitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { getInternalTransferTransactionIds } from "./internalTransfers";
import { mapStoredTransactionToSummary } from "./mapStoredTransaction";
import type {
  StoredMonthlyTransactionRow,
  StoredOwnAccountForTransferMatching
} from "./types";

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
    .select(
      `
      id,
      account_id,
      booking_status,
      booking_date,
      amount,
      currency,
      description,
      merchant_name,
      counterparty_name,
      counterparty_account_last4,
      counterparty_account_fingerprint,
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
    `
    )
    .eq("user_id", userId)
    .gte("booking_date", range.from)
    .lt("booking_date", range.to)
    .order("booking_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not list transactions: ${error.message}`);
  }

  const rows = (data ?? []) as StoredMonthlyTransactionRow[];
  const ownAccounts = await listOwnAccountsForTransferMatching(userId);
  const internalTransferIds = getInternalTransferTransactionIds(
    rows,
    ownAccounts
  );

  return rows.map((row) =>
    mapStoredTransactionToSummary(
      row,
      internalTransferIds.has(row.id) ? "internal_transfer" : "external"
    )
  );
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
