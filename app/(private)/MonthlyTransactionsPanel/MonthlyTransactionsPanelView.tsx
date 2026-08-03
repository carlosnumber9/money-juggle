"use client";

import { useMemo, useState } from "react";

import type {
  MonthlyTransactionCategory,
  MonthlyTransactionsPanelProps,
  TransactionLabelSummary
} from "@/definitions";

import { EmptyTransactionsState } from "./EmptyTransactionsState";
import { MonthlyTransactionsHeader } from "./MonthlyTransactionsHeader";
import { TransactionDetailDialog } from "./TransactionDetailDialog";
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
import { updateTransactionCategoryInList } from "./transactionCategoryAssignment";
import { TransactionsTable } from "./TransactionsTable";

export function MonthlyTransactionsPanel({
  transactions,
  categoryGroups,
  labels,
  selectedMonth,
  error
}: MonthlyTransactionsPanelProps) {
  const [displayTransactions, setDisplayTransactions] = useState(transactions);
  const [availableLabels, setAvailableLabels] = useState(labels);
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);
  const [transactionFilters, setTransactionFilters] =
    useState<TransactionFilters>(DEFAULT_TRANSACTION_FILTERS);
  const filteredTransactions = useMemo(
    () => filterMonthlyTransactions(displayTransactions, transactionFilters),
    [displayTransactions, transactionFilters]
  );
  const categoryFilterTransactions = useMemo(
    () =>
      filterTransactionsForCategoryFilterOptions(
        displayTransactions,
        transactionFilters.activeChipFilters
      ),
    [displayTransactions, transactionFilters.activeChipFilters]
  );
  const selectedTransaction =
    displayTransactions.find(
      (transaction) => transaction.id === selectedTransactionId
    ) ?? null;
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
        displayTransactions
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

  function handleTransactionLabelsChange(
    transactionId: string,
    nextLabels: TransactionLabelSummary[]
  ) {
    setDisplayTransactions((currentTransactions) =>
      currentTransactions.map((transaction) =>
        transaction.id === transactionId
          ? { ...transaction, labels: nextLabels }
          : transaction
      )
    );
  }

  function handleTransactionCategoryChange(
    transactionId: string,
    nextCategory: MonthlyTransactionCategory | null
  ) {
    setDisplayTransactions((currentTransactions) =>
      updateTransactionCategoryInList(
        currentTransactions,
        transactionId,
        nextCategory
      )
    );
  }

  function handleAvailableLabelAdd(label: TransactionLabelSummary) {
    setAvailableLabels((currentLabels) =>
      currentLabels.some((currentLabel) => currentLabel.id === label.id)
        ? currentLabels
        : [...currentLabels, label].sort((left, right) =>
            left.name.localeCompare(right.name, "es")
          )
    );
  }

  return (
    <section aria-labelledby="monthly-transactions-title">
      <MonthlyTransactionsHeader
        message={error}
        selectedMonth={selectedMonth}
        categoryGroups={categoryGroupsWithVisibleTransactions}
        filters={transactionFilters}
        onFilterToggle={handleFilterToggle}
        onUncategorizedFilterToggle={handleUncategorizedFilterToggle}
        onCategoryToggle={handleCategoryToggle}
        onClearCategoryFilters={handleClearCategoryFilters}
      />

      {filteredTransactions.length > 0 ? (
        <TransactionsTable
          transactions={filteredTransactions}
          categoryGroups={categoryGroups}
          onTransactionCategoryChange={handleTransactionCategoryChange}
          onTransactionSelect={(transaction) =>
            setSelectedTransactionId(transaction.id)
          }
        />
      ) : (
        <EmptyTransactionsState
          hasActiveFilters={hasActiveTransactionFilters(transactionFilters)}
          monthLabel={selectedMonth.label}
        />
      )}

      <TransactionDetailDialog
        transaction={selectedTransaction}
        availableLabels={availableLabels}
        onLabelsChange={handleTransactionLabelsChange}
        onAvailableLabelAdd={handleAvailableLabelAdd}
        onClose={() => setSelectedTransactionId(null)}
      />
    </section>
  );
}
