"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

import {
  ChartContainer as RechartsChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import type { CurrentMonthCategoryExpensesSummary } from "@/definitions";

import { ChartContainer } from "./ChartContainer";

const chartConfig = {
  expenses: {
    label: "Gastos",
    color: "oklch(from var(--primary) l calc(c * 0.5) h)"
  }
} satisfies ChartConfig;

export function CategoryExpensesRadarChart({
  summary,
  error,
  className
}: {
  summary: CurrentMonthCategoryExpensesSummary;
  error: string | null;
  className?: string;
}) {
  const hasCategoryExpenses = summary.points.length > 0;

  return (
    <ChartContainer
      title="Gastos por categoría"
      description={error ?? getDescription(summary, hasCategoryExpenses)}
      className={className}
      headerClassName="items-center text-center"
    >
      {hasCategoryExpenses ? (
        <RechartsChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[320px] w-full overflow-visible [&_.recharts-polar-angle-axis]:[z-index:20] [&_.recharts-surface]:overflow-visible [&_.recharts-wrapper]:overflow-visible"
        >
          <RadarChart
            accessibilityLayer
            data={summary.points}
            margin={{
              top: 16,
              right: 24,
              bottom: 16,
              left: 24
            }}
          >
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="min-w-44"
                  formatter={(value) => (
                    <>
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{
                          backgroundColor: "var(--color-expenses)"
                        }}
                      />
                      <span className="text-muted-foreground">Gastos</span>
                      <span className="ml-auto font-mono font-medium text-foreground tabular-nums">
                        {formatCurrency(Number(value), summary.currency)}
                      </span>
                    </>
                  )}
                />
              }
            />
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="var(--chart-3)"
              strokeOpacity={0.3}
            />
            <Radar
              dataKey="expenses"
              fill="var(--color-expenses)"
              fillOpacity={0.32}
              stroke="var(--color-expenses)"
              strokeWidth={2}
              dot={false}
            />
            <PolarAngleAxis
              dataKey="categoryName"
              tick={{
                fill: "var(--muted-foreground)",
                fontSize: 12
              }}
              tickLine={false}
            />
          </RadarChart>
        </RechartsChartContainer>
      ) : (
        <div className="flex min-h-[240px] items-center justify-center text-center text-sm text-muted-foreground">
          No hay gastos categorizados este mes.
        </div>
      )}
    </ChartContainer>
  );
}

function getDescription(
  summary: CurrentMonthCategoryExpensesSummary,
  hasCategoryExpenses: boolean
): string {
  if (!hasCategoryExpenses) {
    return `Sin categorías con gasto en ${summary.monthLabel}.`;
  }

  const uncategorizedText =
    summary.uncategorizedExpenseCount > 0
      ? ` · ${summary.uncategorizedExpenseCount} sin categoría`
      : "";

  return `${formatCurrency(summary.totalExpenses, summary.currency)} en ${summary.monthLabel}${uncategorizedText}`;
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency
  }).format(value);
}
