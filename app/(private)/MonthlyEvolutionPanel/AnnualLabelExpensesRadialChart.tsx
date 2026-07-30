"use client";

import { LabelList, RadialBar, RadialBarChart } from "recharts";

import {
  ChartContainer as RechartsChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import type { AnnualLabelExpensesSummary } from "@/definitions";

import {
  annualLabelExpensesChartConfig,
  buildAnnualLabelExpensesChartData
} from "./annualLabelExpensesChart";
import { ChartContainer } from "./ChartContainer";
import {
  formatAnnualLabelExpensesDescription,
  formatCurrency
} from "./formatters";

export function AnnualLabelExpensesRadialChart({
  summary,
  error
}: {
  summary: AnnualLabelExpensesSummary;
  error: string | null;
}) {
  const chartData = buildAnnualLabelExpensesChartData(summary.points);
  const hasLabelExpenses = chartData.length > 0;

  return (
    <ChartContainer
      title={`Gastos por etiqueta · ${summary.year}`}
      description={error ?? formatAnnualLabelExpensesDescription(summary)}
      className="h-full"
      headerClassName="items-center text-center"
    >
      {hasLabelExpenses ? (
        <RechartsChartContainer
          config={annualLabelExpensesChartConfig}
          className="mx-auto aspect-square max-h-[320px] w-full"
        >
          <RadialBarChart
            accessibilityLayer
            data={chartData}
            startAngle={-90}
            endAngle={380}
            innerRadius={30}
            outerRadius={130}
          >
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  className="min-w-52"
                  formatter={(value, _name, item) => (
                    <>
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{
                          backgroundColor: item.payload.fill
                        }}
                      />
                      <span className="text-muted-foreground">
                        {item.payload.labelName}
                      </span>
                      <span className="ml-auto font-mono font-medium text-foreground tabular-nums">
                        {formatCurrency(Number(value), summary.currency)}
                      </span>
                    </>
                  )}
                />
              }
            />
            <RadialBar dataKey="expenses" background>
              <LabelList
                position="insideStart"
                dataKey="labelName"
                className="fill-white mix-blend-luminosity"
                fontSize={11}
              />
            </RadialBar>
          </RadialBarChart>
        </RechartsChartContainer>
      ) : (
        <div className="flex min-h-[240px] items-center justify-center text-center text-sm text-muted-foreground">
          No hay gastos etiquetados en {summary.year}.
        </div>
      )}
    </ChartContainer>
  );
}
