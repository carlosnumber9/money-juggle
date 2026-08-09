import type {
  AnnualLabelExpensesSummary,
  MonthlyTransactionSummary
} from "@/definitions";
import { isInternalTransfer } from "@/lib/domain/internalTransfers";

import { formatDecimal, parseDecimal } from "./decimal";

export function buildAnnualLabelExpensesSummary({
  transactions,
  year
}: {
  transactions: MonthlyTransactionSummary[];
  year: number;
}): AnnualLabelExpensesSummary {
  const eligibleTransactions = transactions.filter((transaction) => {
    const amount = parseDecimal(transaction.amount);

    return (
      amount !== 0n &&
      !isInternalTransfer(transaction) &&
      transaction.labels.length > 0 &&
      isTransactionInYear(transaction.reporting_date, year)
    );
  });
  const currency = getPrimaryCurrency(eligibleTransactions) ?? "EUR";
  const totalsByLabel = new Map<
    string,
    {
      labelName: string;
      expenses: bigint;
      transactionCount: number;
    }
  >();
  let totalExpenses = 0n;
  let transactionCount = 0;

  for (const transaction of eligibleTransactions) {
    if (transaction.currency !== currency) {
      continue;
    }

    const expenses = -parseDecimal(transaction.amount);

    totalExpenses += expenses;
    transactionCount += 1;

    for (const label of transaction.labels) {
      const current = totalsByLabel.get(label.id) ?? {
        labelName: label.name,
        expenses: 0n,
        transactionCount: 0
      };

      totalsByLabel.set(label.id, {
        labelName: label.name,
        expenses: current.expenses + expenses,
        transactionCount: current.transactionCount + 1
      });
    }
  }

  return {
    year,
    currency,
    points: Array.from(totalsByLabel.entries())
      .sort(([, leftTotal], [, rightTotal]) => {
        const expenseDifference =
          rightTotal.expenses > leftTotal.expenses
            ? 1
            : rightTotal.expenses < leftTotal.expenses
              ? -1
              : 0;

        return (
          expenseDifference ||
          leftTotal.labelName.localeCompare(rightTotal.labelName)
        );
      })
      .map(([labelId, total]) => ({
        labelId,
        labelName: total.labelName,
        expenses: Number(formatDecimal(total.expenses)),
        transactionCount: total.transactionCount
      })),
    totalExpenses: Number(formatDecimal(totalExpenses)),
    transactionCount
  };
}

function getPrimaryCurrency(
  transactions: MonthlyTransactionSummary[]
): string | null {
  const currencyCounts = new Map<string, number>();

  for (const transaction of transactions) {
    currencyCounts.set(
      transaction.currency,
      (currencyCounts.get(transaction.currency) ?? 0) + 1
    );
  }

  return (
    Array.from(currencyCounts.entries()).sort(
      ([leftCurrency, leftCount], [rightCurrency, rightCount]) =>
        rightCount - leftCount || leftCurrency.localeCompare(rightCurrency)
    )[0]?.[0] ?? null
  );
}

function isTransactionInYear(
  bookingDate: string | null,
  year: number
): boolean {
  return bookingDate?.startsWith(`${year}-`) ?? false;
}
