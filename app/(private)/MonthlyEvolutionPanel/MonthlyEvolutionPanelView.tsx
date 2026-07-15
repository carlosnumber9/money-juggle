"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import { Card, CardContent } from "@/components/ui/card";
import type { MonthlyEvolutionPanelProps } from "@/definitions";

import { CategoryExpensesRadarChart } from "./CategoryExpensesRadarChart";

const chartConfig = {
  income: {
    label: "Ingresos",
    color: "color-mix(in oklch, var(--chart-3) 45%, oklch(0.68 0 0))"
  },
  expenses: {
    label: "Gastos",
    color: "color-mix(in oklch, var(--primary) 45%, oklch(0.68 0 0))"
  }
} satisfies ChartConfig;

export function MonthlyEvolutionPanel({
  evolution,
  categoryExpenses,
  error,
  categoryExpensesError
}: MonthlyEvolutionPanelProps) {
  return (
    <section
      className="relative left-1/2 box-border w-screen -translate-x-1/2 px-6"
      aria-label="Evolución"
    >
      <Card className="w-full p-0">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-6 flex flex-col gap-1">
            <h2 className="text-lg font-semibold tracking-normal">
              Progreso anual
            </h2>
            <p className="text-sm text-muted-foreground">
              {error ?? formatAnnualTotals(evolution)}
            </p>
          </div>
          <ChartContainer
            config={chartConfig}
            className="h-[360px] min-h-[260px] w-full"
          >
            <LineChart
              accessibilityLayer
              data={evolution.points}
              margin={{
                top: 12,
                right: 24,
                left: 12,
                bottom: 8
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="monthLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={76}
                tickFormatter={(value) =>
                  formatCompactCurrency(Number(value), evolution.currency)
                }
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent indicator="line" className="min-w-56" />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                dataKey="income"
                type="monotone"
                stroke="var(--color-income)"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  fill: "var(--color-income)",
                  r: 5
                }}
              />
              <Line
                dataKey="expenses"
                type="monotone"
                stroke="var(--color-expenses)"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  fill: "var(--color-expenses)",
                  r: 5
                }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <div className="mt-6 flex w-full">
        <CategoryExpensesRadarChart
          summary={categoryExpenses}
          error={categoryExpensesError}
          className="lg:w-1/2"
        />
      </div>
    </section>
  );
}

function formatAnnualTotals(
  evolution: MonthlyEvolutionPanelProps["evolution"]
): string {
  const totals = evolution.points.reduce(
    (currentTotals, point) => ({
      income: currentTotals.income + point.income,
      expenses: currentTotals.expenses + point.expenses
    }),
    { income: 0, expenses: 0 }
  );

  return `${formatCurrency(totals.income, evolution.currency)} ingresados | ${formatCurrency(totals.expenses, evolution.currency)} gastados`;
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency
  }).format(value);
}

function formatCompactCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}
