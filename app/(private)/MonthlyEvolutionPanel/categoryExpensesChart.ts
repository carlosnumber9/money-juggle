import type { ChartConfig } from "@/components/ui/chart";

export const categoryExpensesChartConfig = {
  expenses: {
    label: "Gastos",
    color: "oklch(from var(--primary) l calc(c * 0.5) h)"
  }
} satisfies ChartConfig;
