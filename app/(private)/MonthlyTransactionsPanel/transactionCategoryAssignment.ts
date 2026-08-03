import type {
  MonthlyTransactionCategory,
  MonthlyTransactionSummary
} from "@/definitions";

export function updateTransactionCategoryInList(
  transactions: MonthlyTransactionSummary[],
  transactionId: string,
  category: MonthlyTransactionCategory | null
): MonthlyTransactionSummary[] {
  return transactions.map((transaction) =>
    transaction.id === transactionId
      ? { ...transaction, category }
      : transaction
  );
}
