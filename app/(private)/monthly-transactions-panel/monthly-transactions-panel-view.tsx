"use client";

import type { MonthlyTransactionsPanelProps } from "@/definitions";

import { EmptyTransactionsState } from "./empty-transactions-state";
import { MonthlyTransactionsHeader } from "./monthly-transactions-header";
import { TransactionsTable } from "./transactions-table";
import { useTransactionSync } from "./use-transaction-sync";

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
