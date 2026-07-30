import type {
  MonthlyCashflowBucket,
  MonthlyCashflowSummary,
  MonthlyTransactionSummary
} from "@/definitions";
import { isTransactionExcludedFromMetrics } from "@/lib/domain/transactionMetrics";

import { formatDecimal, parseDecimal } from "./decimal";

export function buildMonthlyCashflowSummary(
  transactions: MonthlyTransactionSummary[]
): MonthlyCashflowSummary {
  const income = createCashflowBuilder();
  const expenses = createCashflowBuilder();

  for (const transaction of transactions) {
    if (isTransactionExcludedFromMetrics(transaction)) {
      continue;
    }

    const amount = parseDecimal(transaction.amount);

    if (amount > 0n) {
      income.add(transaction.currency, amount);
      continue;
    }

    if (amount < 0n) {
      expenses.add(transaction.currency, -amount);
    }
  }

  return {
    income: income.toBucket(),
    expenses: expenses.toBucket()
  };
}

function createCashflowBuilder() {
  const totalsByCurrency = new Map<
    string,
    {
      amount: bigint;
      transactionCount: number;
    }
  >();

  return {
    add(currency: string, amount: bigint) {
      const current = totalsByCurrency.get(currency) ?? {
        amount: 0n,
        transactionCount: 0
      };

      totalsByCurrency.set(currency, {
        amount: current.amount + amount,
        transactionCount: current.transactionCount + 1
      });
    },
    toBucket(): MonthlyCashflowBucket {
      const totals = Array.from(totalsByCurrency.entries())
        .sort(([leftCurrency], [rightCurrency]) =>
          leftCurrency.localeCompare(rightCurrency)
        )
        .map(([currency, total]) => ({
          amount: formatDecimal(total.amount),
          currency,
          transactionCount: total.transactionCount
        }));

      return {
        totals,
        transactionCount: totals.reduce(
          (count, total) => count + total.transactionCount,
          0
        )
      };
    }
  };
}
