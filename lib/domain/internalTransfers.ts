import type {
  MonthlyTransactionRange,
  MonthlyTransactionSummary
} from "@/definitions";

export const INTERNAL_TRANSFER_MATCH_DAY_DISTANCE = 3;

export function isInternalTransfer(
  transaction: Pick<MonthlyTransactionSummary, "cashflow_type" | "category">
): boolean {
  return (
    transaction.cashflow_type === "internal_transfer" ||
    transaction.category?.slug === "internal_transfer"
  );
}

export function getInternalTransferMatchingRange(
  range: MonthlyTransactionRange
): MonthlyTransactionRange {
  return {
    from: shiftDate(range.from, -INTERNAL_TRANSFER_MATCH_DAY_DISTANCE),
    to: shiftDate(range.to, INTERNAL_TRANSFER_MATCH_DAY_DISTANCE)
  };
}

export function isBookingDateInRange(
  bookingDate: string | null,
  range: MonthlyTransactionRange
): boolean {
  return (
    bookingDate !== null && bookingDate >= range.from && bookingDate < range.to
  );
}

function shiftDate(value: string, dayAmount: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + dayAmount);

  return date.toISOString().slice(0, 10);
}
