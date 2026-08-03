import type {
  MonthlyTransactionCategory,
  MonthlyTransactionSummary,
  TransactionCategoryGroupSummary
} from "@/definitions";

export const UNCATEGORIZED_CATEGORY_VALUE = "__uncategorized__";

export function getInitialCategorySelectValue(
  transaction: MonthlyTransactionSummary
): string {
  return transaction.category?.id ?? UNCATEGORIZED_CATEGORY_VALUE;
}

export function getCategoryIdFromSelectValue(value: string): string | null {
  return value === UNCATEGORIZED_CATEGORY_VALUE ? null : value;
}

export function getCategoryFromSelectValue(
  selectedCategoryValue: string,
  categoryGroups: TransactionCategoryGroupSummary[],
  transaction: MonthlyTransactionSummary
): MonthlyTransactionCategory | null {
  if (selectedCategoryValue === UNCATEGORIZED_CATEGORY_VALUE) {
    return null;
  }

  if (selectedCategoryValue === transaction.category?.id) {
    return transaction.category;
  }

  for (const group of categoryGroups) {
    const category = group.categories.find(
      (candidate) => candidate.id === selectedCategoryValue
    );

    if (category) {
      return {
        ...category,
        group: {
          id: group.id,
          name: group.name
        }
      };
    }
  }

  return null;
}

export function getSelectedCategoryLabel(
  selectedCategoryValue: string,
  categoryGroups: TransactionCategoryGroupSummary[],
  transaction: MonthlyTransactionSummary
): string {
  if (selectedCategoryValue === UNCATEGORIZED_CATEGORY_VALUE) {
    return "Sin categoría";
  }

  if (selectedCategoryValue === transaction.category?.id) {
    return transaction.category.name;
  }

  for (const group of categoryGroups) {
    const category = group.categories.find(
      (candidate) => candidate.id === selectedCategoryValue
    );

    if (category) {
      return category.name;
    }
  }

  return "Sin categoría";
}
