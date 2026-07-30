import type { ChartConfig } from "@/components/ui/chart";
import type { AnnualLabelExpensePoint } from "@/definitions";

export const annualLabelExpensesChartConfig = {
  expenses: {
    label: "Gastos",
    color: "var(--primary)"
  }
} satisfies ChartConfig;

const LABEL_COLORS = [
  "var(--primary)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)"
] as const;

export function buildAnnualLabelExpensesChartData(
  points: AnnualLabelExpensePoint[]
) {
  return points.map((point, index) => ({
    ...point,
    fill: LABEL_COLORS[index % LABEL_COLORS.length]
  }));
}
