import type {
  MonthlyTransactionSummary,
  TransactionCategoryGroupSummary
} from "@/definitions";

export function getCategoryFilterLabel(
  selectedCategoryIds: string[],
  categoryGroups: TransactionCategoryGroupSummary[]
): string {
  if (selectedCategoryIds.length === 0) {
    return "Categorías";
  }

  if (selectedCategoryIds.length === 1) {
    return (
      getCategoryName(selectedCategoryIds[0], categoryGroups) ?? "1 categoría"
    );
  }

  return `${selectedCategoryIds.length} categorías`;
}

export function getFilteredCategoryGroups(
  categoryGroups: TransactionCategoryGroupSummary[],
  searchValue: string
): TransactionCategoryGroupSummary[] {
  const normalizedSearchValue = normalizeSearchValue(searchValue);

  if (!normalizedSearchValue) {
    return categoryGroups;
  }

  return categoryGroups
    .map((group) => ({
      ...group,
      categories: group.categories.filter((category) =>
        normalizeSearchValue(`${group.name} ${category.name}`).includes(
          normalizedSearchValue
        )
      )
    }))
    .filter((group) => group.categories.length > 0);
}

export function getTransactionCategoryGroupsWithMatches(
  categoryGroups: TransactionCategoryGroupSummary[],
  transactions: MonthlyTransactionSummary[]
): TransactionCategoryGroupSummary[] {
  const visibleCategoryIds = new Set(
    transactions
      .map((transaction) => transaction.category?.id)
      .filter((categoryId): categoryId is string => Boolean(categoryId))
  );

  if (visibleCategoryIds.size === 0) {
    return [];
  }

  return categoryGroups
    .map((group) => ({
      ...group,
      categories: group.categories.filter((category) =>
        visibleCategoryIds.has(category.id)
      )
    }))
    .filter((group) => group.categories.length > 0);
}

function getCategoryName(
  categoryId: string,
  categoryGroups: TransactionCategoryGroupSummary[]
): string | null {
  for (const group of categoryGroups) {
    const category = group.categories.find((item) => item.id === categoryId);

    if (category) {
      return category.name;
    }
  }

  return null;
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase("es");
}
