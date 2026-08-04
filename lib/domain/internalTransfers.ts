import type { MonthlyTransactionSummary } from "@/definitions";

export function isInternalTransfer(
  transaction: Pick<MonthlyTransactionSummary, "cashflow_type" | "category">
): boolean {
  return (
    transaction.cashflow_type === "internal_transfer" ||
    transaction.category?.slug === "internal_transfer"
  );
}
