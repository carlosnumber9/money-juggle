"use client";

import type { MonthlyTransactionsPanelProps } from "@/definitions";

import { EmptyTransactionsState } from "./EmptyTransactionsState";
import { MonthlyTransactionsHeader } from "./MonthlyTransactionsHeader";
import { TransactionsTable } from "./TransactionsTable";
import { useTransactionSync } from "./useTransactionSync";

export function MonthlyTransactionsPanel({
  enabled,
  transactions,
  error
}: MonthlyTransactionsPanelProps) {
  const { isSyncing, syncError } = useTransactionSync(enabled);
  const message = syncError ?? error;

  return (
    <section aria-labelledby="monthly-transactions-title">
      <MonthlyTransactionsHeader
        message={message}
        isSyncing={isSyncing}
        enabled={enabled}
      />

      {transactions.length > 0 ? (
        <TransactionsTable transactions={transactions} />
      ) : (
        <EmptyTransactionsState isSyncing={isSyncing} />
      )}
    </section>
  );
}
