import type { MonthlyTransactionSummary } from "@/definitions";

export const INTERNAL_TRANSFER_MATCH_DAY_DISTANCE = 3;

export function isInternalTransfer(
  transaction: Pick<MonthlyTransactionSummary, "cashflow_type" | "category">
): boolean {
  return (
    transaction.cashflow_type === "internal_transfer" ||
    transaction.category?.slug === "internal_transfer"
  );
}
