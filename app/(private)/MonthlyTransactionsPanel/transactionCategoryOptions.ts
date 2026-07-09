import type {
  MonthlyTransactionSummary,
  TransactionCategoryGroupSummary
} from "@/definitions";

export function getSelectedCategoryLabel(
  selectedCategoryId: string | null,
  categoryGroups: TransactionCategoryGroupSummary[],
  transaction: MonthlyTransactionSummary
): string {
  if (!selectedCategoryId) {
    return "Sin categoría";
  }

  if (selectedCategoryId === transaction.category?.id) {
    return transaction.category.name;
  }

  for (const group of categoryGroups) {
    const category = group.categories.find(
      (candidate) => candidate.id === selectedCategoryId
    );

    if (category) {
      return category.name;
    }
  }

  return "Sin categoría";
}
