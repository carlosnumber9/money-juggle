import type {
  MonthlyEvolutionSummary,
  MonthlyTransactionSummary,
  TransactionReconciliationAdjustment
} from "@/definitions";
import { isExcludedFromIncomeReports } from "@/lib/domain/incomeReporting";
import { buildReportingMovementSet } from "@/lib/domain/reportingMovements";
import { isSavingsTransferCategory } from "@/lib/domain/savingsTransfers";

import { formatDecimal, parseDecimal } from "./decimal";

const MONTH_LABELS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic"
] as const;

export function buildMonthlyEvolutionSummary({
  transactions,
  adjustments = [],
  year
}: {
  transactions: MonthlyTransactionSummary[];
  adjustments?: TransactionReconciliationAdjustment[];
  year: number;
}): MonthlyEvolutionSummary {
  const reporting = buildReportingMovementSet({ transactions, adjustments });
  const reportableMovements = reporting.movements.filter((movement) => {
    const amount = parseDecimal(movement.amount);

    return amount <= 0n || !isExcludedFromIncomeReports(movement);
  });
  const currency = getPrimaryCurrency(reportableMovements) ?? "EUR";
  const savingsCharges = transactions.filter((transaction) => {
    return (
      isSavingsTransferCategory(transaction) &&
      parseDecimal(transaction.amount) < 0n &&
      getMonthIndex(transaction.reporting_date, year) !== null
    );
  });
  const savingsCurrency = getPrimaryCurrency(savingsCharges) ?? currency;
  const totals = MONTH_LABELS.map((monthLabel, index) => ({
    month: index + 1,
    monthLabel,
    income: 0n,
    expenses: 0n,
    savings: 0n
  }));
  let transactionCount = 0;
  let excludedInternalTransferCount = 0;

  for (const transaction of reportableMovements) {
    if (transaction.currency !== currency) {
      continue;
    }

    const monthIndex = getMonthIndex(transaction.reporting_date, year);

    if (monthIndex === null) {
      continue;
    }

    const amount = parseDecimal(transaction.amount);

    if (amount === 0n) {
      continue;
    }

    transactionCount += 1;

    if (amount > 0n) {
      totals[monthIndex].income += amount;
      continue;
    }

    totals[monthIndex].expenses += -amount;
  }

  for (const transaction of savingsCharges) {
    if (transaction.currency !== savingsCurrency) {
      continue;
    }

    const monthIndex = getMonthIndex(transaction.reporting_date, year);

    if (monthIndex === null) {
      continue;
    }

    totals[monthIndex].savings += -parseDecimal(transaction.amount);
  }

  excludedInternalTransferCount = reporting.excludedTransactions.filter(
    ({ transaction, reason }) =>
      reason === "internal_transfer" &&
      transaction.currency === currency &&
      getMonthIndex(transaction.reporting_date, year) !== null &&
      parseDecimal(transaction.amount) !== 0n
  ).length;

  return {
    year,
    currency,
    savingsCurrency,
    points: totals.map((point) => ({
      month: point.month,
      monthLabel: point.monthLabel,
      income: Number(formatDecimal(point.income)),
      expenses: Number(formatDecimal(point.expenses)),
      savings: Number(formatDecimal(point.savings))
    })),
    transactionCount,
    excludedInternalTransferCount
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

function getMonthIndex(
  bookingDate: string | null,
  year: number
): number | null {
  if (!bookingDate) {
    return null;
  }

  const [bookingYear, bookingMonth] = bookingDate.split("-").map(Number);

  if (
    bookingYear !== year ||
    !bookingMonth ||
    bookingMonth < 1 ||
    bookingMonth > 12
  ) {
    return null;
  }

  return bookingMonth - 1;
}
