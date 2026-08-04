import type {
  MonthlyCategoryExpensesSummary,
  MonthlyTransactionSummary
} from "@/definitions";

import { formatDecimal, parseDecimal } from "./decimal";

const EXCLUDED_CATEGORY_SLUGS = new Set([
  "community_fees",
  "home_insurance",
  "internet_mobile",
  "mortgage",
  "savings_transfer",
  "shared_expense_settlement"
]);

export function buildMonthlyCategoryExpensesSummary({
  transactions,
  periodStart
}: {
  transactions: MonthlyTransactionSummary[];
  periodStart: string;
}): MonthlyCategoryExpensesSummary {
  const currency = getPrimaryCurrency(transactions) ?? "EUR";
  const totalsByCategory = new Map<
    string,
    {
      categoryName: string;
      categoryGroupName: string;
      expenses: bigint;
      transactionCount: number;
    }
  >();
  let uncategorizedExpenseCount = 0;
  let excludedInternalTransferCount = 0;
  const excludedCategoryNames = new Set<string>();

  for (const transaction of transactions) {
    if (transaction.currency !== currency) {
      continue;
    }

    const amount = parseDecimal(transaction.amount);

    if (amount === 0n) {
      continue;
    }

    if (transaction.cashflow_type === "internal_transfer") {
      excludedInternalTransferCount += 1;
      continue;
    }

    if (!transaction.category) {
      if (amount < 0n) {
        uncategorizedExpenseCount += 1;
      }

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
  }

  const reportableCategoryTotals = Array.from(
    totalsByCategory.entries()
  ).filter(([, total]) => total.expenses > 0n);
  const totalExpenses = reportableCategoryTotals.reduce(
    (sum, [, total]) => sum + total.expenses,
    0n
  );
  const transactionCount = reportableCategoryTotals.reduce(
    (count, [, total]) => count + total.transactionCount,
    0
  );

  return {
    monthLabel: formatMonthLabel(periodStart),
    currency,
    points: reportableCategoryTotals
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
    excludedInternalTransferCount,
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
