import type { MonthlyTransactionSummary } from "@/definitions";
import { isInternalTransfer } from "@/lib/domain/internalTransfers";

export type TransactionFilterId = "ing" | "caixabank" | "income" | "expense";

type InstitutionFilterId = Extract<
  MonthlyTransactionSummary["institution_slug"],
  TransactionFilterId
>;

export type TransactionFilters = {
  activeChipFilters: TransactionFilterId[];
  showUncategorized: boolean;
  selectedCategoryIds: string[];
};

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilters = {
  activeChipFilters: [],
  showUncategorized: false,
  selectedCategoryIds: []
};

export function toggleTransactionChipFilter(
  filters: TransactionFilters,
  filterId: TransactionFilterId
): TransactionFilters {
  return {
    ...filters,
    activeChipFilters: filters.activeChipFilters.includes(filterId)
      ? filters.activeChipFilters.filter(
          (currentFilter) => currentFilter !== filterId
        )
      : [...filters.activeChipFilters, filterId]
  };
}

export function toggleUncategorizedFilter(
  filters: TransactionFilters
): TransactionFilters {
  const nextShowUncategorized = !filters.showUncategorized;

  return {
    ...filters,
    showUncategorized: nextShowUncategorized,
    selectedCategoryIds: nextShowUncategorized
      ? []
      : filters.selectedCategoryIds
  };
}

export function toggleCategoryFilter(
  filters: TransactionFilters,
  categoryId: string
): TransactionFilters {
  const selectedCategoryIds = filters.selectedCategoryIds.includes(categoryId)
    ? filters.selectedCategoryIds.filter(
        (selectedCategoryId) => selectedCategoryId !== categoryId
      )
    : [...filters.selectedCategoryIds, categoryId];

  return {
    ...filters,
    showUncategorized: false,
    selectedCategoryIds
  };
}

export function clearCategoryFilters(
  filters: TransactionFilters
): TransactionFilters {
  return {
    ...filters,
    selectedCategoryIds: []
  };
}

export function removeCategoryFiltersWithoutMatches(
  filters: TransactionFilters,
  transactions: MonthlyTransactionSummary[]
): TransactionFilters {
  if (filters.selectedCategoryIds.length === 0) {
    return filters;
  }

  const matchingCategoryIds = new Set(
    filterTransactionsForCategoryFilterOptions(
      transactions,
      filters.activeChipFilters
    )
      .map((transaction) => transaction.category?.id)
      .filter((categoryId): categoryId is string => Boolean(categoryId))
  );
  const selectedCategoryIds = filters.selectedCategoryIds.filter((categoryId) =>
    matchingCategoryIds.has(categoryId)
  );

  if (selectedCategoryIds.length === filters.selectedCategoryIds.length) {
    return filters;
  }

  return {
    ...filters,
    selectedCategoryIds
  };
}

export function filterMonthlyTransactions(
  transactions: MonthlyTransactionSummary[],
  filters: TransactionFilters
): MonthlyTransactionSummary[] {
  if (!hasActiveTransactionFilters(filters)) {
    return transactions;
  }

  return transactions.filter((transaction) => {
    return (
      matchesInstitutionFilter(transaction, filters.activeChipFilters) &&
      matchesAmountFilter(transaction, filters.activeChipFilters) &&
      matchesCategoryFilter(transaction, filters)
    );
  });
}

export function filterTransactionsForCategoryFilterOptions(
  transactions: MonthlyTransactionSummary[],
  activeChipFilters: TransactionFilterId[]
): MonthlyTransactionSummary[] {
  if (activeChipFilters.length === 0) {
    return transactions;
  }

  return transactions.filter((transaction) => {
    return (
      matchesInstitutionFilter(transaction, activeChipFilters) &&
      matchesAmountFilter(transaction, activeChipFilters)
    );
  });
}

export function hasActiveTransactionFilters(
  filters: TransactionFilters
): boolean {
  return (
    filters.activeChipFilters.length > 0 ||
    filters.showUncategorized ||
    filters.selectedCategoryIds.length > 0
  );
}

export function isTransactionChipFilterDisabled(
  filterId: TransactionFilterId,
  activeChipFilters: TransactionFilterId[]
): boolean {
  const oppositeFilter = getOppositeFilter(filterId);

  return oppositeFilter ? activeChipFilters.includes(oppositeFilter) : false;
}

function matchesInstitutionFilter(
  transaction: MonthlyTransactionSummary,
  activeChipFilters: TransactionFilterId[]
): boolean {
  const institutionFilters = activeChipFilters.filter(isInstitutionFilter);

  if (institutionFilters.length === 0) {
    return true;
  }

  if (transaction.institution_slug === "unknown") {
    return false;
  }

  return institutionFilters.every(
    (institutionFilter) => transaction.institution_slug === institutionFilter
  );
}

function matchesAmountFilter(
  transaction: MonthlyTransactionSummary,
  activeChipFilters: TransactionFilterId[]
): boolean {
  const showIncome = activeChipFilters.includes("income");
  const showExpenses = activeChipFilters.includes("expense");

  if (!showIncome && !showExpenses) {
    return true;
  }

  if (isInternalTransfer(transaction)) {
    return false;
  }

  const amount = Number(transaction.amount);

  return (!showIncome || amount > 0) && (!showExpenses || amount < 0);
}

function matchesCategoryFilter(
  transaction: MonthlyTransactionSummary,
  filters: TransactionFilters
): boolean {
  if (filters.showUncategorized) {
    return transaction.category === null;
  }

  if (filters.selectedCategoryIds.length === 0) {
    return true;
  }

  return transaction.category
    ? filters.selectedCategoryIds.includes(transaction.category.id)
    : false;
}

function isInstitutionFilter(
  filterId: TransactionFilterId
): filterId is InstitutionFilterId {
  return filterId === "ing" || filterId === "caixabank";
}

function getOppositeFilter(
  filterId: TransactionFilterId
): TransactionFilterId | null {
  switch (filterId) {
    case "ing":
      return "caixabank";
    case "caixabank":
      return "ing";
    case "income":
      return "expense";
    case "expense":
      return "income";
  }
}
