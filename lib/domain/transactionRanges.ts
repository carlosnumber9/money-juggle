const APP_TIME_ZONE = "Europe/Madrid";

export type TransactionDateRange = {
  from: string;
  to: string;
};

export function getCurrentMonthTransactionRange(
  date = new Date()
): TransactionDateRange {
  const today = getDatePartsInAppTimeZone(date);
  const nextMonth =
    today.month === 12
      ? { year: today.year + 1, month: 1 }
      : { year: today.year, month: today.month + 1 };

  return {
    from: formatDatePart(today.year, today.month, 1),
    to: formatDatePart(nextMonth.year, nextMonth.month, 1)
  };
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

export function getCurrentMonthProviderDateRange(date = new Date()) {
  const today = getDatePartsInAppTimeZone(date);

  return {
    from: formatDatePart(today.year, today.month, 1),
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

function formatDatePart(year: number, month: number, day: number): string {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0")
  ].join("-");
}
