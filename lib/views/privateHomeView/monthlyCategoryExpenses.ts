import type {
  MonthlyCategoryExpensesSummary,
  MonthlyTransactionSummary
} from "@/definitions";
import { isTransactionExcludedFromMetrics } from "@/lib/domain/transactionMetrics";

import { formatDecimal, parseDecimal } from "./decimal";

const EXCLUDED_CATEGORY_SLUGS = new Set(["mortgage"]);

export function buildMonthlyCategoryExpensesSummary({
  transactions,
  periodStart
}: {
  transactions: MonthlyTransactionSummary[];
  periodStart: string;
}): MonthlyCategoryExpensesSummary {
  const eligibleTransactions = transactions.filter(
    (transaction) => !isTransactionExcludedFromMetrics(transaction)
  );
  const currency = getPrimaryCurrency(eligibleTransactions) ?? "EUR";
  const totalsByCategory = new Map<
    string,
    {
      categoryName: string;
      categoryGroupName: string;
      expenses: bigint;
      transactionCount: number;
    }
  >();
  let transactionCount = 0;
  let totalExpenses = 0n;
  let uncategorizedExpenseCount = 0;
  const excludedCategoryNames = new Set<string>();

  for (const transaction of eligibleTransactions) {
    if (transaction.currency !== currency) {
      continue;
    }

    const amount = parseDecimal(transaction.amount);

    if (amount >= 0n) {
      continue;
    }

    if (!transaction.category) {
      uncategorizedExpenseCount += 1;
      continue;
    }

    if (EXCLUDED_CATEGORY_SLUGS.has(transaction.category.slug)) {
      excludedCategoryNames.add(transaction.category.name);
      continue;
    }

    const expenses = -amount;
    const current = totalsByCategory.get(transaction.category.id) ?? {
      categoryName: transaction.category.name,
      categoryGroupName: transaction.category.group.name,
      expenses: 0n,
      transactionCount: 0
    };

    totalsByCategory.set(transaction.category.id, {
      ...current,
      expenses: current.expenses + expenses,
      transactionCount: current.transactionCount + 1
    });
    totalExpenses += expenses;
    transactionCount += 1;
  }

  return {
    monthLabel: formatMonthLabel(periodStart),
    currency,
    points: Array.from(totalsByCategory.entries())
      .sort(([, leftTotal], [, rightTotal]) => {
        const expenseDifference =
          rightTotal.expenses > leftTotal.expenses
            ? 1
            : rightTotal.expenses < leftTotal.expenses
              ? -1
              : 0;

        return (
          expenseDifference ||
          leftTotal.categoryName.localeCompare(rightTotal.categoryName)
        );
      })
      .map(([categoryId, total]) => ({
        categoryId,
        categoryName: total.categoryName,
        categoryGroupName: total.categoryGroupName,
        expenses: Number(formatDecimal(total.expenses)),
        transactionCount: total.transactionCount
      })),
    totalExpenses: Number(formatDecimal(totalExpenses)),
    transactionCount,
    uncategorizedExpenseCount,
    excludedCategoryNames: Array.from(excludedCategoryNames).sort(
      (left, right) => left.localeCompare(right)
    )
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

function formatMonthLabel(periodStart: string): string {
  const [year, month] = periodStart.split("-").map(Number);

  if (!year || !month) {
    return "mes actual";
  }

  return new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}
