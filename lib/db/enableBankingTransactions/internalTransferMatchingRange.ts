import type { MonthlyTransactionRange } from "@/definitions";
import { INTERNAL_TRANSFER_MATCH_DAY_DISTANCE } from "@/lib/domain/internalTransfers";

export function getInternalTransferMatchingRange(
  rows: Array<{ booking_date: string | null }>
): MonthlyTransactionRange | null {
  const bookingDates = rows
    .map((row) => row.booking_date)
    .filter((date): date is string => date !== null)
    .sort();

  if (bookingDates.length === 0) {
    return null;
  }

  return {
    from: shiftDate(bookingDates[0], -INTERNAL_TRANSFER_MATCH_DAY_DISTANCE),
    to: shiftDate(
      bookingDates.at(-1)!,
      INTERNAL_TRANSFER_MATCH_DAY_DISTANCE + 1
    )
  };
}

function shiftDate(value: string, dayAmount: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + dayAmount);

  return date.toISOString().slice(0, 10);
}
