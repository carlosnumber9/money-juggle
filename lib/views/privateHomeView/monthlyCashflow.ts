import type {
  MonthlyCashflowBucket,
  MonthlyCashflowSummary,
  MonthlyTransactionSummary,
  TransactionReconciliationAdjustment
} from "@/definitions";
import { isExcludedFromIncomeReports } from "@/lib/domain/incomeReporting";
import { buildReportingMovementSet } from "@/lib/domain/reportingMovements";

import { formatDecimal, parseDecimal } from "./decimal";

export function buildMonthlyCashflowSummary(
  input:
    | MonthlyTransactionSummary[]
    | {
        transactions: MonthlyTransactionSummary[];
        adjustments?: TransactionReconciliationAdjustment[];
      }
): MonthlyCashflowSummary {
  const reporting = buildReportingMovementSet(
    Array.isArray(input) ? { transactions: input } : input
  );
  const income = createCashflowBuilder();
  const expenses = createCashflowBuilder();

  for (const transaction of reporting.movements) {
    const amount = parseDecimal(transaction.amount);

    if (amount > 0n) {
      if (!isExcludedFromIncomeReports(transaction)) {
        income.add(transaction.currency, amount);
      }

      continue;
    }

    if (amount < 0n) {
      expenses.add(transaction.currency, -amount);
    }
  }

  for (const excluded of reporting.excludedTransactions) {
    if (excluded.reason !== "internal_transfer") {
      continue;
    }

    const amount = parseDecimal(excluded.transaction.amount);

    if (amount > 0n) {
      income.excludeInternalTransfer();
    } else if (amount < 0n) {
      expenses.excludeInternalTransfer();
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
  let excludedInternalTransferCount = 0;

  return {
    excludeInternalTransfer() {
      excludedInternalTransferCount += 1;
    },
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
        ),
        excludedInternalTransferCount
      };
    }
  };
}
