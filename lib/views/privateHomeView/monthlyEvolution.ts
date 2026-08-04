import type {
  MonthlyEvolutionSummary,
  MonthlyTransactionSummary
} from "@/definitions";
import { isInternalTransfer } from "@/lib/domain/internalTransfers";

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
  year
}: {
  transactions: MonthlyTransactionSummary[];
  year: number;
}): MonthlyEvolutionSummary {
  const currency =
    getPrimaryCurrency(
      transactions.filter((item) => !isInternalTransfer(item))
    ) ?? "EUR";
  const totals = MONTH_LABELS.map((monthLabel, index) => ({
    month: index + 1,
    monthLabel,
    income: 0n,
    expenses: 0n
  }));
  let transactionCount = 0;
  let excludedInternalTransferCount = 0;

  for (const transaction of transactions) {
    if (transaction.currency !== currency) {
      continue;
    }

    const monthIndex = getMonthIndex(transaction.booking_date, year);

    if (monthIndex === null) {
      continue;
    }

    const amount = parseDecimal(transaction.amount);

    if (amount === 0n) {
      continue;
    }

    if (isInternalTransfer(transaction)) {
      excludedInternalTransferCount += 1;
      continue;
    }

    transactionCount += 1;

    if (amount > 0n) {
      totals[monthIndex].income += amount;
      continue;
    }

    totals[monthIndex].expenses += -amount;
  }

  return {
    year,
    currency,
    points: totals.map((point) => ({
      month: point.month,
      monthLabel: point.monthLabel,
      income: Number(formatDecimal(point.income)),
      expenses: Number(formatDecimal(point.expenses))
    })),
    transactionCount,
    excludedInternalTransferCount
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
