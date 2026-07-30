import { describe, expect, it } from "vitest";

import { buildAnnualLabelExpensesChartData } from "./annualLabelExpensesChart";

describe("buildAnnualLabelExpensesChartData", () => {
  it("assigns app chart colors in a stable repeating order", () => {
    const points = Array.from({ length: 6 }, (_, index) => ({
      labelId: `label-${index}`,
      labelName: `Etiqueta ${index}`,
      expenses: 10 - index,
      transactionCount: 1
    }));

    expect(
      buildAnnualLabelExpensesChartData(points).map((point) => point.fill)
    ).toEqual([
      "var(--primary)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
      "var(--primary)"
    ]);
    expect(points[0]).not.toHaveProperty("fill");
  });
});
