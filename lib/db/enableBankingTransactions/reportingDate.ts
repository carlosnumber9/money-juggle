export function getReportingDateForSync(
  existingReportingDate: string | null | undefined,
  bookingDate: string | null
): string | null {
  return existingReportingDate ?? bookingDate;
}
