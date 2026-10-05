import { getSelectedTransactionMonth } from "@/lib/domain/transactionRanges";

export function getExportPeriod(value: unknown, now = new Date()) {
  if (typeof value !== "string") return null;
  const period = getSelectedTransactionMonth(value, now);
  return period.value === value ? period : null;
}

export function getDefaultExportMonth(now = new Date()) {
  return getSelectedTransactionMonth(undefined, now).previousMonth;
}

export function getMadridDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function shiftReportDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isInReportRange(
  value: string | null,
  range: { from: string; to: string }
): boolean {
  return value !== null && value >= range.from && value < range.to;
}
