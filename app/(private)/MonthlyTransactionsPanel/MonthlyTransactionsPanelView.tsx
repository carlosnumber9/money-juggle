"use client";

import { useMemo, useState } from "react";

import type { MonthlyTransactionsPanelProps } from "@/definitions";

import { EmptyTransactionsState } from "./EmptyTransactionsState";
import { MonthlyTransactionsHeader } from "./MonthlyTransactionsHeader";
import {
  filterMonthlyTransactions,
  type TransactionFilterId
} from "./TransactionFilterChips";
import { TransactionsTable } from "./TransactionsTable";
import { useTransactionSync } from "./useTransactionSync";

export function MonthlyTransactionsPanel({
  enabled,
  transactions,
  error
}: MonthlyTransactionsPanelProps) {
  const [activeFilters, setActiveFilters] = useState<TransactionFilterId[]>([]);
  const { isSyncing, syncError } = useTransactionSync(enabled);
  const message = syncError ?? error;
  const filteredTransactions = useMemo(
    () => filterMonthlyTransactions(transactions, activeFilters),
    [activeFilters, transactions]
  );

  function handleFilterToggle(filterId: TransactionFilterId) {
    setActiveFilters((currentFilters) =>
      currentFilters.includes(filterId)
        ? currentFilters.filter((currentFilter) => currentFilter !== filterId)
        : [...currentFilters, filterId]
    );
  }

  return (
    <section aria-labelledby="monthly-transactions-title">
      <MonthlyTransactionsHeader
        message={message}
        isSyncing={isSyncing}
        enabled={enabled}
        activeFilters={activeFilters}
        onFilterToggle={handleFilterToggle}
      />

      {filteredTransactions.length > 0 ? (
        <TransactionsTable transactions={filteredTransactions} />
      ) : (
        <EmptyTransactionsState
          isSyncing={isSyncing}
          hasActiveFilters={activeFilters.length > 0}
        />
      )}
    </section>
  );
}
