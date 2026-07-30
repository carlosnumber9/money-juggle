import type { ChartConfig } from "@/components/ui/chart";

export const monthlyEvolutionChartConfig = {
  income: {
    label: "Ingresos",
    color: "color-mix(in oklch, var(--chart-3) 45%, oklch(0.68 0 0))"
  },
  expenses: {
    label: "Gastos",
    color: "color-mix(in oklch, var(--primary) 45%, oklch(0.68 0 0))"
  }
} satisfies ChartConfig;
