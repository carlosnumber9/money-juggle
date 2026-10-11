import "server-only";
import type {
  CategoryRuleTransaction,
  MonthlyTransactionRange
} from "@/definitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listTransactionReconciliationStates } from "@/lib/db/transactionReconciliations";
import { getInternalTransferTransactionIds } from "@/lib/db/enableBankingTransactions/internalTransfers";
import {
  listOwnAccountsForTransferMatching,
  MONTHLY_TRANSACTION_SELECT
} from "@/lib/db/enableBankingTransactions/transactionReadContext";
import type { StoredMonthlyTransactionRow } from "@/lib/db/enableBankingTransactions/types";

type HistoryRow = StoredMonthlyTransactionRow & {
  first_seen_at: string;
  category_id: string | null;
  category_source: "manual" | "rule" | null;
};
export async function listCategoryRuleHistory(
  userId: string,
  range: MonthlyTransactionRange
): Promise<{ rows: CategoryRuleTransaction[]; truncated: boolean }> {
  const db = await createSupabaseServerClient();
  const rows: HistoryRow[] = [];
  for (let offset = 0; offset <= 5000; offset += 500) {
    const { data, error } = await db
      .from("transactions")
      .select(`${MONTHLY_TRANSACTION_SELECT},first_seen_at`)
      .eq("user_id", userId)
      .eq("booking_status", "booked")
      .gte("booking_date", range.from)
      .lt("booking_date", range.to)
      .order("booking_date", { ascending: false })
      .order("id")
      .range(offset, Math.min(offset + 499, 5000));
    if (error) throw new Error("Could not read category rule history.");
    rows.push(...((data ?? []) as HistoryRow[]));
    if (!data || data.length < 500 || rows.length > 5000) break;
  }
  const truncated = rows.length > 5000;
  const selected = rows.slice(0, 5000);
  const [accounts, reconciliations] = await Promise.all([
    listOwnAccountsForTransferMatching(userId),
    listTransactionReconciliationStates({
      userId,
      transactionIds: selected.map((row) => row.id)
    })
  ]);
  const transfers = getInternalTransferTransactionIds(selected, accounts);
  return {
    truncated,
    rows: selected.map((row) => {
      const category = Array.isArray(row.transaction_categories)
        ? row.transaction_categories[0]
        : row.transaction_categories;
      return {
        id: row.id,
        account_id: row.account_id,
        booking_status: row.booking_status,
        booking_date: row.booking_date,
        first_seen_at: row.first_seen_at,
        amount: row.amount,
        currency: row.currency,
        description: row.description,
        merchant_name: row.merchant_name,
        counterparty_name: row.counterparty_name,
        category_id: row.category_id,
        category_source: row.category_source,
        excluded:
          transfers.has(row.id) ||
          reconciliations.has(row.id) ||
          category?.slug === "internal_transfer"
      };
    })
  };
}
