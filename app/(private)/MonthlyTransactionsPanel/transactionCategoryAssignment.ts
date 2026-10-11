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
      ? {
          ...transaction,
          category,
          ...(transaction.category_source !== undefined
            ? {
                category_source: "manual" as const,
                category_rule_id: null,
                category_rule_version: null,
                category_rule_conflict: false
              }
            : {})
        }
      : transaction
  );
}
