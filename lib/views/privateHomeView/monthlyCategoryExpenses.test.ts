import type { MonthlyTransactionSummary } from "@/definitions";
import { describe, expect, it } from "vitest";

import { buildMonthlyCategoryExpensesSummary } from "./monthlyCategoryExpenses";

describe("buildMonthlyCategoryExpensesSummary", () => {
  it("excludes internal transfers before totals, counts, and currency selection", () => {
    const summary = buildMonthlyCategoryExpensesSummary({
      periodStart: "2026-07-01",
      transactions: [
        createTransaction({
          id: "groceries",
          amount: "-40",
          category: createCategory("groceries", "Supermercado")
        }),
        createTransaction({
          id: "uncategorized",
          amount: "-10"
        }),
        createTransaction({
          id: "categorized-transfer",
          amount: "-500",
          currency: "USD",
          category: createCategory("internal_transfer", "Transferencia interna")
        }),
        createTransaction({
          id: "detected-transfer",
          amount: "-600",
          currency: "USD",
          cashflow_type: "internal_transfer"
        })
      ]
    });

    expect(summary).toEqual({
      monthLabel: "julio de 2026",
      currency: "EUR",
      points: [
        {
          categoryId: "groceries",
          categoryName: "Supermercado",
          categoryGroupName: "Grupo",
          expenses: 40,
          transactionCount: 1
        }
      ],
      totalExpenses: 40,
      transactionCount: 1,
      uncategorizedExpenseCount: 1,
      excludedCategoryNames: []
    });
  });
});

function createTransaction(
  overrides: Partial<MonthlyTransactionSummary> = {}
): MonthlyTransactionSummary {
  return {
    id: "transaction",
    institution_slug: "ing",
    institution_name: "ING",
    institution_provider_id: "ES:ING",
    account_id: "account",
    account_name: "Cuenta",
    account_iban_last4: "1234",
    booking_status: "booked",
    booking_date: "2026-07-15",
    cashflow_type: "external",
    amount: "-10",
    currency: "EUR",
    description: "Movimiento",
    merchant_name: null,
    counterparty_name: null,
    category: null,
    labels: [],
    ...overrides
  };
}

function createCategory(
  slug: string,
  name: string
): NonNullable<MonthlyTransactionSummary["category"]> {
  return {
    id: slug,
    name,
    slug,
    group: {
      id: "group",
      name: "Grupo"
    }
  };
}
