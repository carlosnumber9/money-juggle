"use client";

import { useMemo, useState } from "react";

import type { MonthlyTransactionsPanelProps } from "@/definitions";

import { EmptyTransactionsState } from "./EmptyTransactionsState";
import { MonthlyTransactionsHeader } from "./MonthlyTransactionsHeader";
import {
  clearCategoryFilters,
  DEFAULT_TRANSACTION_FILTERS,
  filterMonthlyTransactions,
  filterTransactionsForCategoryFilterOptions,
  hasActiveTransactionFilters,
  removeCategoryFiltersWithoutMatches,
  toggleCategoryFilter,
  toggleTransactionChipFilter,
  toggleUncategorizedFilter,
  type TransactionFilterId,
  type TransactionFilters
} from "./transactionFilters";
import { getTransactionCategoryGroupsWithMatches } from "./transactionCategoryFilterOptions";
import { TransactionsTable } from "./TransactionsTable";
import { useTransactionSync } from "./useTransactionSync";

export function MonthlyTransactionsPanel({
  enabled,
  transactions,
  categoryGroups,
  error
}: MonthlyTransactionsPanelProps) {
  const [transactionFilters, setTransactionFilters] =
    useState<TransactionFilters>(DEFAULT_TRANSACTION_FILTERS);
  const { isSyncing, syncError, syncTransactions } =
    useTransactionSync(enabled);
  const message = syncError ?? error;
  const filteredTransactions = useMemo(
    () => filterMonthlyTransactions(transactions, transactionFilters),
    [transactionFilters, transactions]
  );
  const categoryFilterTransactions = useMemo(
    () =>
      filterTransactionsForCategoryFilterOptions(
        transactions,
        transactionFilters.activeChipFilters
      ),
    [transactionFilters.activeChipFilters, transactions]
  );
  const categoryGroupsWithVisibleTransactions = useMemo(
    () =>
      getTransactionCategoryGroupsWithMatches(
        categoryGroups,
        categoryFilterTransactions
      ),
    [categoryFilterTransactions, categoryGroups]
  );

  function handleFilterToggle(filterId: TransactionFilterId) {
    setTransactionFilters((currentFilters) =>
      removeCategoryFiltersWithoutMatches(
        toggleTransactionChipFilter(currentFilters, filterId),
        transactions
      )
    );
  }

  function handleUncategorizedFilterToggle() {
    setTransactionFilters((currentFilters) =>
      toggleUncategorizedFilter(currentFilters)
    );
  }

  function handleCategoryToggle(categoryId: string) {
    setTransactionFilters((currentFilters) =>
      toggleCategoryFilter(currentFilters, categoryId)
    );
  }

  function handleClearCategoryFilters() {
    setTransactionFilters((currentFilters) =>
      clearCategoryFilters(currentFilters)
    );
  }

  return (
    <section aria-labelledby="monthly-transactions-title">
      <MonthlyTransactionsHeader
        message={message}
        isSyncing={isSyncing}
        enabled={enabled}
        categoryGroups={categoryGroupsWithVisibleTransactions}
        filters={transactionFilters}
        onFilterToggle={handleFilterToggle}
        onUncategorizedFilterToggle={handleUncategorizedFilterToggle}
        onCategoryToggle={handleCategoryToggle}
        onClearCategoryFilters={handleClearCategoryFilters}
        onSyncTransactions={syncTransactions}
      />

      {filteredTransactions.length > 0 ? (
        <TransactionsTable
          transactions={filteredTransactions}
          categoryGroups={categoryGroups}
        />
      ) : (
        <EmptyTransactionsState
          isSyncing={isSyncing}
          hasActiveFilters={hasActiveTransactionFilters(transactionFilters)}
        />
      )}
    </section>
  );
}
