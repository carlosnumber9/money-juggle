import { describe, expect, it } from "vitest";

import {
  formatAnnualLabelExpensesDescription,
  formatAnnualTotals,
  formatMonthlyCategoryExpensesDescription
} from "./formatters";

describe("monthly evolution formatters", () => {
  it("formats annual income and expense totals", () => {
    const description = formatAnnualTotals({
      year: 2026,
      currency: "EUR",
      points: [
        {
          month: 1,
          monthLabel: "Ene",
          income: 100,
          expenses: 25
        },
        {
          month: 2,
          monthLabel: "Feb",
          income: 50,
          expenses: 10.5
        }
      ],
      transactionCount: 4
    });

    expect(normalizeWhitespace(description)).toBe(
      "150,00 € ingresados | 35,50 € gastados"
    );
  });

  it("explains labeled expenses and the empty state", () => {
    expect(
      normalizeWhitespace(
        formatAnnualLabelExpensesDescription({
          year: 2026,
          currency: "EUR",
          points: [
            {
              labelId: "travel",
              labelName: "Viaje",
              expenses: 42.5,
              transactionCount: 1
            }
          ],
          totalExpenses: 42.5,
          transactionCount: 1
        })
      )
    ).toBe("42,50 € en gastos etiquetados");

    expect(
      formatAnnualLabelExpensesDescription({
        year: 2026,
        currency: "EUR",
        points: [],
        totalExpenses: 0,
        transactionCount: 0
      })
    ).toBe("Los gastos sin etiqueta no se incluyen.");
  });

  it("preserves the monthly category description", () => {
    const description = formatMonthlyCategoryExpensesDescription({
      monthLabel: "julio de 2026",
      currency: "EUR",
      points: [
        {
          categoryId: "groceries",
          categoryName: "Supermercado",
          categoryGroupName: "Necesidades",
          expenses: 80,
          transactionCount: 2
        }
      ],
      totalExpenses: 80,
      transactionCount: 2,
      uncategorizedExpenseCount: 1,
      excludedCategoryNames: ["Hipoteca"]
    });

    expect(normalizeWhitespace(description)).toBe(
      "80,00 € en julio de 2026 · 1 sin categoría · Hipoteca excluida"
    );
  });
});

function normalizeWhitespace(value: string): string {
  return value.replace(/\s/gu, " ");
}
