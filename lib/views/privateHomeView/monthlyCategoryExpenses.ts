import type {
  MonthlyCategoryExpensesSummary,
  MonthlyTransactionSummary,
  TransactionReconciliationAdjustment
} from "@/definitions";
import {
  buildReportingMovementSet,
  type ReportingMovement
} from "@/lib/domain/reportingMovements";

import { buildCategoryTotals } from "./categoryTotals";
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
  adjustments = [],
  periodStart
}: {
  transactions: MonthlyTransactionSummary[];
  adjustments?: TransactionReconciliationAdjustment[];
  periodStart: string;
}): MonthlyCategoryExpensesSummary {
  const reporting = buildReportingMovementSet({ transactions, adjustments });
  const currency = getPrimaryCurrency(reporting.movements) ?? "EUR";
  const categorizedMovements: ReportingMovement[] = [];
  let uncategorizedExpenseCount = 0;
  const excludedInternalTransferCount = reporting.excludedTransactions.filter(
    ({ transaction, reason }) =>
      reason === "internal_transfer" && transaction.currency === currency
  ).length;
  const excludedCategoryNames = new Set<string>();

  for (const transaction of reporting.movements) {
    if (transaction.currency !== currency) {
      continue;
    }

    const amount = parseDecimal(transaction.amount);

    if (amount === 0n) {
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

    categorizedMovements.push(transaction);
  }

  const reportableCategoryTotals = buildCategoryTotals(
    categorizedMovements
  ).filter((total) => total.amount < 0n);
  const totalExpenses = reportableCategoryTotals.reduce(
    (sum, total) => sum - total.amount,
    0n
  );
  const transactionCount = reportableCategoryTotals.reduce(
    (count, total) => count + total.transactionCount,
    0
  );

  return {
    monthLabel: formatMonthLabel(periodStart),
    currency,
    points: reportableCategoryTotals
      .sort((leftTotal, rightTotal) => {
        const expenseDifference =
          rightTotal.amount < leftTotal.amount
            ? 1
            : rightTotal.amount > leftTotal.amount
              ? -1
              : 0;

        return (
          expenseDifference ||
          leftTotal.category.name.localeCompare(rightTotal.category.name)
        );
      })
      .map((total) => ({
        categoryId: total.category.id,
        categoryName: total.category.name,
        categoryGroupName: total.category.group.name,
        expenses: Number(formatDecimal(-total.amount)),
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
  transactions: Array<{ currency: string }>
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
