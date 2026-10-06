import type {
  AnnualLabelExpensesSummary,
  MonthlyCategoryExpensesSummary,
  MonthlyEvolutionSummary
} from "@/definitions";

export function formatAnnualTotals(evolution: MonthlyEvolutionSummary): string {
  const totals = evolution.points.reduce(
    (currentTotals, point) => ({
      income: currentTotals.income + point.income,
      expenses: currentTotals.expenses + point.expenses
    }),
    { income: 0, expenses: 0 }
  );

  return `${formatCurrency(totals.income, evolution.currency)} ingresados | ${formatCurrency(totals.expenses, evolution.currency)} gastados`;
}

export function formatAnnualSavingsDescription(
  summary: MonthlyEvolutionSummary
): string {
  const totalSavings = summary.points.reduce(
    (total, point) => total + point.savings,
    0
  );

  return `${formatCurrency(totalSavings, summary.savingsCurrency)} de ahorro neto`;
}

export function formatAnnualLabelExpensesDescription(
  summary: AnnualLabelExpensesSummary
): string {
  if (summary.points.length === 0) {
    return "Los gastos sin etiqueta no se incluyen.";
  }

  return `${formatCurrency(summary.totalExpenses, summary.currency)} en gastos etiquetados`;
}

export function formatMonthlyCategoryExpensesDescription(
  summary: MonthlyCategoryExpensesSummary
): string {
  return formatCurrency(summary.totalExpenses, summary.currency);
}

export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency
  }).format(value);
}

export function formatCompactCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}
