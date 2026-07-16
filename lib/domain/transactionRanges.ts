const APP_TIME_ZONE = "Europe/Madrid";

export type TransactionDateRange = {
  from: string;
  to: string;
};

export type SelectedTransactionMonth = {
  value: string;
  label: string;
  previousMonth: string;
  nextMonth: string | null;
  range: TransactionDateRange;
};

export function getSelectedTransactionMonth(
  requestedMonth?: string,
  date = new Date()
): SelectedTransactionMonth {
  const today = getDatePartsInAppTimeZone(date);
  const currentMonth = { year: today.year, month: today.month };
  const selectedMonth = parseMonth(requestedMonth);
  const resolvedMonth =
    selectedMonth && compareMonths(selectedMonth, currentMonth) <= 0
      ? selectedMonth
      : currentMonth;
  const nextMonth = shiftMonth(resolvedMonth, 1);
  const isCurrentMonth = compareMonths(resolvedMonth, currentMonth) === 0;

  return {
    value: formatMonth(resolvedMonth),
    label: formatMonthLabel(resolvedMonth),
    previousMonth: formatMonth(shiftMonth(resolvedMonth, -1)),
    nextMonth: isCurrentMonth ? null : formatMonth(nextMonth),
    range: {
      from: formatDatePart(resolvedMonth.year, resolvedMonth.month, 1),
      to: formatDatePart(nextMonth.year, nextMonth.month, 1)
    }
  };
}

export function getCurrentMonthTransactionRange(
  date = new Date()
): TransactionDateRange {
  return getSelectedTransactionMonth(undefined, date).range;
}

export function getCurrentYearTransactionRange(
  date = new Date()
): TransactionDateRange {
  const today = getDatePartsInAppTimeZone(date);

  return {
    from: formatDatePart(today.year, 1, 1),
    to: formatDatePart(today.year + 1, 1, 1)
  };
}

export function getIncrementalProviderDateRange(date = new Date()) {
  const today = getDatePartsInAppTimeZone(date);
  const previousMonth =
    today.month === 1
      ? { year: today.year - 1, month: 12 }
      : { year: today.year, month: today.month - 1 };

  return {
    from: formatDatePart(previousMonth.year, previousMonth.month, 1),
    to: formatDatePart(today.year, today.month, today.day)
  };
}

export function getCurrentYearProviderDateRange(date = new Date()) {
  const today = getDatePartsInAppTimeZone(date);

  return {
    from: formatDatePart(today.year, 1, 1),
    to: formatDatePart(today.year, today.month, today.day)
  };
}

function getDatePartsInAppTimeZone(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day")
  };
}

function parseMonth(value?: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value ?? "");

  if (!match) {
    return null;
  }

  const year = Number(match[1]);

  if (year < 2000) {
    return null;
  }

  return {
    year,
    month: Number(match[2])
  };
}

function compareMonths(
  left: { year: number; month: number },
  right: { year: number; month: number }
): number {
  return left.year * 12 + left.month - (right.year * 12 + right.month);
}

function shiftMonth(
  value: { year: number; month: number },
  amount: number
): { year: number; month: number } {
  const absoluteMonth = value.year * 12 + value.month - 1 + amount;

  return {
    year: Math.floor(absoluteMonth / 12),
    month: (absoluteMonth % 12) + 1
  };
}

function formatMonth(value: { year: number; month: number }): string {
  return [
    String(value.year).padStart(4, "0"),
    String(value.month).padStart(2, "0")
  ].join("-");
}

function formatMonthLabel(value: { year: number; month: number }): string {
  return new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(value.year, value.month - 1, 1)));
}

function formatDatePart(year: number, month: number, day: number): string {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0")
  ].join("-");
}
