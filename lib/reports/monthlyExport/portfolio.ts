import type { PortfolioSnapshot } from "@/definitions";
import { parseDecimal } from "@/lib/domain/decimal";
import { shiftReportDate } from "./period";
import type { MonthlyExportReport } from "./types";

export function buildReportPortfolio(
  snapshot: PortfolioSnapshot | null,
  endExclusive: string
): MonthlyExportReport["portfolio"] {
  if (!snapshot) return null;
  if (snapshot.reportDate >= endExclusive) {
    throw new Error("Portfolio snapshot falls after the report period.");
  }
  const total = snapshot.positions.reduce(
    (sum, position) => sum + parseDecimal(position.value),
    0n
  );
  if (total !== parseDecimal(snapshot.investments)) {
    throw new Error("Portfolio valuation does not match its positions.");
  }
  return {
    reportDate: snapshot.reportDate,
    currency: snapshot.currency,
    investments: snapshot.investments,
    positions: [...snapshot.positions].sort((a, b) => {
      const difference = parseDecimal(b.value) - parseDecimal(a.value);
      return difference > 0n
        ? 1
        : difference < 0n
          ? -1
          : a.isin.localeCompare(b.isin);
    }),
    observations: [
      "Última foto confirmada disponible hasta el cierre del mes, según la fecha del informe PDF.",
      snapshot.reportDate === shiftReportDate(endExclusive, -1)
        ? "Foto fechada en el último día del mes; valoración observada, sin garantía de cobertura completa."
        : "La foto no corresponde al cierre exacto del mes; se conserva su fecha real, incluso si pertenece a un mes anterior.",
      "Valoraciones declaradas del PDF, sin recalcular con precios redondeados. No representan aportaciones, coste de compra ni rentabilidad.",
      "El efectivo del PDF no se exporta ni se suma a saldos bancarios, ingresos o gastos."
    ].join(" ")
  };
}
