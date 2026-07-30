"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer as RechartsChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import type { MonthlyEvolutionPanelProps } from "@/definitions";

import { AnnualLabelExpensesRadialChart } from "./AnnualLabelExpensesRadialChart";
import { CategoryExpensesRadarChart } from "./CategoryExpensesRadarChart";
import { ChartContainer } from "./ChartContainer";
import { formatAnnualTotals, formatCompactCurrency } from "./formatters";
import { monthlyEvolutionChartConfig } from "./monthlyEvolutionChart";

export function MonthlyEvolutionPanel({
  evolution,
  categoryExpenses,
  labelExpenses,
  selectedMonth,
  error,
  categoryExpensesError,
  labelExpensesError
}: MonthlyEvolutionPanelProps) {
  return (
    <section
      className="relative left-1/2 box-border w-screen -translate-x-1/2 px-6"
      aria-label="Evolución"
    >
      <ChartContainer
        title={`Progreso anual · ${evolution.year}`}
        description={error ?? formatAnnualTotals(evolution)}
        headerClassName="items-center text-center lg:items-start lg:text-left"
      >
        <RechartsChartContainer
          config={monthlyEvolutionChartConfig}
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
        </RechartsChartContainer>
      </ChartContainer>
      <div className="mt-6 grid w-full gap-6 lg:grid-cols-2">
        <CategoryExpensesRadarChart
          summary={categoryExpenses}
          selectedMonth={selectedMonth}
          error={categoryExpensesError}
        />
        <AnnualLabelExpensesRadialChart
          summary={labelExpenses}
          error={labelExpensesError}
        />
      </div>
    </section>
  );
}
