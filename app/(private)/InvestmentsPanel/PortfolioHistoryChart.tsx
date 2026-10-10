"use client";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import type { InvestmentsView } from "@/definitions";
import { formatPortfolioDate, portfolioHistoryConfig } from "./formatters";
import { formatCompactCurrency } from "../MonthlyEvolutionPanel/formatters";

export function PortfolioHistoryChart({
  points
}: {
  points: InvestmentsView["points"];
}) {
  return (
    <ChartContainer
      config={portfolioHistoryConfig}
      className="h-[360px] min-h-[260px] w-full"
    >
      <LineChart
        accessibilityLayer
        data={points}
        margin={{ top: 12, right: 24, left: 12, bottom: 8 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="timestamp"
          type="number"
          scale="time"
          domain={
            points.length === 1
              ? [
                  points[0].timestamp - 43_200_000,
                  points[0].timestamp + 43_200_000
                ]
              : ["dataMin", "dataMax"]
          }
          ticks={points.length === 1 ? [points[0].timestamp] : undefined}
          tickFormatter={formatPortfolioDate}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={76}
          tickFormatter={(value) => formatCompactCurrency(Number(value), "EUR")}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => formatPortfolioDate(Number(label))}
              indicator="line"
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          dataKey="cash"
          type="linear"
          stroke="var(--color-cash)"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          dataKey="investments"
          type="linear"
          stroke="var(--color-investments)"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
