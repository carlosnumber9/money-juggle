export function formatPortfolioDate(value: string | number): string {
  const date = new Date(
    typeof value === "string" ? `${value}T00:00:00Z` : value
  );
  if (!Number.isFinite(date.getTime())) {
    return "Fecha no disponible";
  }
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}
export function formatPortfolioTooltipDate(
  _label: unknown,
  payload: readonly { payload?: { date?: string } }[]
): string {
  const date = payload[0]?.payload?.date;
  return date ? formatPortfolioDate(date) : "Fecha no disponible";
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
