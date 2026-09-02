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

  return `${formatCurrency(totalSavings, summary.savingsCurrency)} en movimientos categorizados como ahorro`;
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
  const excludedCategoriesText = getExcludedCategoriesText(
    summary.excludedCategoryNames
  );

  if (summary.points.length === 0) {
    return `Sin categorías con gasto en ${summary.monthLabel}${excludedCategoriesText}.`;
  }

  const uncategorizedText =
    summary.uncategorizedExpenseCount > 0
      ? ` · ${summary.uncategorizedExpenseCount} sin categoría`
      : "";

  return `${formatCurrency(summary.totalExpenses, summary.currency)} en ${summary.monthLabel}${uncategorizedText}${excludedCategoriesText}`;
}

export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency
  }).format(value);
}

function getExcludedCategoriesText(categoryNames: string[]): string {
  if (categoryNames.length === 0) {
    return "";
  }

  const categoryList = new Intl.ListFormat("es-ES", {
    style: "long",
    type: "conjunction"
  }).format(categoryNames);

  return ` · ${categoryList} ${categoryNames.length === 1 ? "excluida" : "excluidas"}`;
}

export function formatCompactCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}
