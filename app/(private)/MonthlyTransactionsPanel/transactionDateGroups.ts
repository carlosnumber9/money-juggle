import type { MonthlyTransactionSummary } from "@/definitions";

export type TransactionDateGroup = {
  date: string | null;
  transactions: MonthlyTransactionSummary[];
};

export function groupTransactionsByDate(
  transactions: MonthlyTransactionSummary[]
): TransactionDateGroup[] {
  const groups: TransactionDateGroup[] = [];

  for (const transaction of transactions) {
    const previousGroup = groups.at(-1);

    if (previousGroup && previousGroup.date === transaction.reporting_date) {
      previousGroup.transactions.push(transaction);
      continue;
    }

    groups.push({
      date: transaction.reporting_date,
      transactions: [transaction]
    });
  }

  return groups;
}
