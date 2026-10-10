export function formatPortfolioDate(value: string | number): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(typeof value === "string" ? `${value}T00:00:00Z` : value));
}
export function formatPositionUnits(value: string): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 6 }).format(
    Number(value)
  );
}
export const portfolioHistoryConfig = {
  cash: { label: "Efectivo", color: "var(--chart-1)" },
  investments: { label: "Inversiones", color: "var(--chart-2)" }
};
