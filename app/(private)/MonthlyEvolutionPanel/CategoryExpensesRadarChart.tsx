"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

import { LoadingOverlay } from "@/app/(private)/LoadingOverlay";
import { MonthNavigation } from "@/app/(private)/MonthNavigation";
import { getSelectedTransactionMonth } from "@/lib/domain/transactionRanges";
import {
  ChartContainer as RechartsChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import type {
  MonthlyCategoryExpensesSummary,
  MonthlyPeriodView
} from "@/definitions";

import { categoryExpensesChartConfig } from "./categoryExpensesChart";
import { ChartContainer } from "./ChartContainer";
import { formatCurrency } from "./formatters";

export function CategoryExpensesRadarChart({
  summary,
  selectedMonth,
  error
}: {
  summary: MonthlyCategoryExpensesSummary;
  selectedMonth: MonthlyPeriodView;
  error: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [requestedMonth, setRequestedMonth] = useState(selectedMonth);
  const displayedMonth = isPending ? requestedMonth : selectedMonth;
  const hasCategoryExpenses = summary.points.length > 0;

  function navigateToMonth(month: string) {
    if (isPending) return;
    setRequestedMonth(getSelectedTransactionMonth(month));
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", month);
    params.set("tab", "evolution");
    startTransition(() => {
      router.push(`${pathname}?${params}`, { scroll: false });
    });
  }

  return (
    <ChartContainer
      title="Gastos por categoría"
      description={isPending ? undefined : error}
      headerActions={
        <MonthNavigation
          selectedMonth={displayedMonth}
          tab="evolution"
          pending={isPending}
          onMonthChange={navigateToMonth}
        />
      }
      className="h-full"
      headerClassName="items-center text-center"
    >
      <LoadingOverlay
        loading={isPending}
        label="Gastos por categoría"
        loadingLabel="Cargando gastos por categoría"
        centerOrb
      >
        {hasCategoryExpenses ? (
          <RechartsChartContainer
            config={categoryExpensesChartConfig}
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
            No hay gastos categorizados en {summary.monthLabel}.
          </div>
        )}
      </LoadingOverlay>
    </ChartContainer>
  );
}
