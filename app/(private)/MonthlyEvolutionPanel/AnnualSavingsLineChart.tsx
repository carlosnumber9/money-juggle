"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer as RechartsChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import type { MonthlyEvolutionSummary } from "@/definitions";

import { annualSavingsChartConfig } from "./annualSavingsChart";
import { ChartContainer } from "./ChartContainer";
import {
  formatAnnualSavingsDescription,
  formatCompactCurrency
} from "./formatters";

export function AnnualSavingsLineChart({
  summary,
  error
}: {
  summary: MonthlyEvolutionSummary;
  error: string | null;
}) {
  return (
    <ChartContainer
      title={`Evolución del ahorro · ${summary.year}`}
      description={error ?? formatAnnualSavingsDescription(summary)}
      className="mt-6"
      headerClassName="items-center text-center lg:items-start lg:text-left"
    >
      <RechartsChartContainer
        config={annualSavingsChartConfig}
        className="h-[360px] min-h-[260px] w-full"
      >
        <LineChart
          accessibilityLayer
          data={summary.points}
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
              formatCompactCurrency(Number(value), summary.currency)
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
            dataKey="savings"
            type="monotone"
            stroke="var(--color-savings)"
            strokeWidth={2}
            dot={false}
            activeDot={{
              fill: "var(--color-savings)",
              r: 5
            }}
          />
        </LineChart>
      </RechartsChartContainer>
    </ChartContainer>
  );
}
