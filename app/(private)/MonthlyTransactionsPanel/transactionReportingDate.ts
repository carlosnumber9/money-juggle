import type { MonthlyTransactionSummary } from "@/definitions";

export function updateTransactionReportingDateInList(
  transactions: MonthlyTransactionSummary[],
  transactionId: string,
  reportingDate: string
): MonthlyTransactionSummary[] {
  return transactions
    .map((transaction) =>
      transaction.id === transactionId
        ? { ...transaction, reporting_date: reportingDate }
        : transaction
    )
    .sort(compareTransactionsByReportingDate);
}

function compareTransactionsByReportingDate(
  left: MonthlyTransactionSummary,
  right: MonthlyTransactionSummary
): number {
  if (left.reporting_date === right.reporting_date) {
    return 0;
  }

  if (left.reporting_date === null) {
    return 1;
  }

  if (right.reporting_date === null) {
    return -1;
  }

  return right.reporting_date.localeCompare(left.reporting_date);
}
