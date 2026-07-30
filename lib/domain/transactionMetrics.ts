import type { MonthlyTransactionSummary } from "@/definitions";

const INTERNAL_TRANSFER_CATEGORY_SLUG = "internal_transfer";

type TransactionMetricCandidate = Pick<
  MonthlyTransactionSummary,
  "cashflow_type" | "category"
>;

export function isAutomaticallyDetectedInternalTransfer(
  transaction: Pick<MonthlyTransactionSummary, "cashflow_type">
): boolean {
  return transaction.cashflow_type === "internal_transfer";
}

export function isTransactionExcludedFromMetrics(
  transaction: TransactionMetricCandidate
): boolean {
  return (
    isAutomaticallyDetectedInternalTransfer(transaction) ||
    transaction.category?.slug === INTERNAL_TRANSFER_CATEGORY_SLUG
  );
}
