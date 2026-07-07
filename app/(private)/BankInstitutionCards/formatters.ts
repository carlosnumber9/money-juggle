import type { BankInstitutionCard } from "@/definitions";

export function formatCurrency(amount: string, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency
  }).format(Number(amount));
}

export function formatLatestDate(
  totals: NonNullable<BankInstitutionCard["balanceTotals"]>
): string {
  const latestFetchedAt = totals
    .map((total) => total.fetchedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  if (!latestFetchedAt) {
    return "recientemente";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(latestFetchedAt));
}
