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
import { TransactionReconciliationDialog } from "./TransactionReconciliationDialog";
import { TransactionReconciliationDetailDialog } from "./TransactionReconciliationDetailDialog";
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
import { updateTransactionReportingDateInList } from "./transactionReportingDate";
import { TransactionsTable } from "./TransactionsTable";

export function MonthlyTransactionsPanel({
  transactions,
  categoryGroups,
  labels,
  reconciliationEnabled,
  selectedMonth,
  error
}: MonthlyTransactionsPanelProps) {
  const [displayTransactions, setDisplayTransactions] = useState(transactions);
  const [availableLabels, setAvailableLabels] = useState(labels);
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);
  const [reconciliationSourceId, setReconciliationSourceId] = useState<
    string | null
  >(null);
  const [selectedReconciliationId, setSelectedReconciliationId] = useState<
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
  const reconciliationSource =
    displayTransactions.find(
      (transaction) => transaction.id === reconciliationSourceId
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

  function handleTransactionReportingDateChange(
    transactionId: string,
    reportingDate: string
  ) {
    setDisplayTransactions((currentTransactions) =>
      updateTransactionReportingDateInList(
        currentTransactions,
        transactionId,
        reportingDate
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

  function handleReconciliationSaved({
    reconciliationId,
    transactionIds,
    previousTransactionIds = [],
    differenceTreatment
  }: {
    reconciliationId: string;
    transactionIds: string[];
    previousTransactionIds?: string[];
    differenceTreatment: NonNullable<
      MonthlyTransactionsPanelProps["transactions"][number]["reconciliation"]
    >["differenceTreatment"];
  }) {
    const memberIds = new Set(transactionIds);
    const previousMemberIds = new Set(previousTransactionIds);

    setDisplayTransactions((currentTransactions) =>
      currentTransactions.map((transaction) => {
        if (memberIds.has(transaction.id)) {
          return {
            ...transaction,
            reconciliation: {
              id: reconciliationId,
              differenceTreatment,
              requiresReview: false
            }
          };
        }

        if (
          previousMemberIds.has(transaction.id) &&
          transaction.reconciliation?.id === reconciliationId
        ) {
          return { ...transaction, reconciliation: null };
        }

        return transaction;
      })
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
          onReconciliationSelect={setSelectedReconciliationId}
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
        onReportingDateChange={handleTransactionReportingDateChange}
        reconciliationEnabled={reconciliationEnabled}
        onReconcile={(transaction) => {
          setSelectedTransactionId(null);
          setReconciliationSourceId(transaction.id);
        }}
        onReconciliationOpen={(reconciliationId) => {
          setSelectedTransactionId(null);
          setSelectedReconciliationId(reconciliationId);
        }}
        onClose={() => setSelectedTransactionId(null)}
      />
      {reconciliationSource ? (
        <TransactionReconciliationDialog
          key={reconciliationSource.id}
          sourceTransaction={reconciliationSource}
          initialDetail={null}
          categoryGroups={categoryGroups}
          availableLabels={availableLabels}
          onSaved={handleReconciliationSaved}
          onClose={() => setReconciliationSourceId(null)}
        />
      ) : null}
      {selectedReconciliationId ? (
        <TransactionReconciliationDetailDialog
          key={selectedReconciliationId}
          reconciliationId={selectedReconciliationId}
          categoryGroups={categoryGroups}
          availableLabels={availableLabels}
          onSaved={handleReconciliationSaved}
          onDeleted={(reconciliationId) => {
            setDisplayTransactions((currentTransactions) =>
              currentTransactions.map((transaction) =>
                transaction.reconciliation?.id === reconciliationId
                  ? { ...transaction, reconciliation: null }
                  : transaction
              )
            );
          }}
          onClose={() => setSelectedReconciliationId(null)}
        />
      ) : null}
    </section>
  );
}
