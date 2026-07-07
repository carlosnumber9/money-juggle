import "server-only";

import type {
  MonthlyTransactionRange,
  MonthlyTransactionSummary
} from "@/definitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { mapStoredTransactionToSummary } from "./mapStoredTransaction";
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
      accounts!inner (
        id,
        name,
        iban_last4,
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

  return ((data ?? []) as StoredMonthlyTransactionRow[]).map((row) =>
    mapStoredTransactionToSummary(row)
  );
}
