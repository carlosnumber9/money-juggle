import "server-only";

import type { BankingDataSource, TransactionMonthData } from "@/definitions";
import { bankingDataSource } from "@/lib/data/bankingDataSource";
import { getSelectedTransactionMonth } from "@/lib/domain/transactionRanges";
import {
  loadMonthlyTransactions,
  loadTransactionCategoryGroups,
  loadTransactionLabels
} from "./privateHomeView/loaders";

export async function getTransactionMonthView(
  userId: string,
  requestedMonth?: string,
  dataSource: BankingDataSource = bankingDataSource
): Promise<TransactionMonthData> {
  const selectedMonth = getSelectedTransactionMonth(requestedMonth);
  const [transactions, categories, labels] = await Promise.all([
    loadMonthlyTransactions(dataSource, userId, selectedMonth.range),
    loadTransactionCategoryGroups(dataSource, userId),
    loadTransactionLabels(dataSource, userId)
  ]);
  return {
    selectedMonth,
    range: selectedMonth.range,
    rows: transactions.ok ? transactions.value : [],
    categoryGroups: categories.ok ? categories.value : [],
    labels: labels.ok ? labels.value : [],
    error: !transactions.ok
      ? transactions.reason
      : !categories.ok
        ? categories.reason
        : !labels.ok
          ? labels.reason
          : null,
    loadedAt: Date.now()
  };
}
