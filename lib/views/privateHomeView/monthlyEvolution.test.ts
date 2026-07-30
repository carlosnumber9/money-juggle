import type { MonthlyTransactionSummary } from "@/definitions";
import { describe, expect, it } from "vitest";

import { buildMonthlyEvolutionSummary } from "./monthlyEvolution";

describe("buildMonthlyEvolutionSummary", () => {
  it("excludes internal transfers before totals, counts, and currency selection", () => {
    const internalTransferCategory = createCategory("internal_transfer");
    const summary = buildMonthlyEvolutionSummary({
      year: 2026,
      transactions: [
        createTransaction({ id: "income", amount: "100" }),
        createTransaction({ id: "expense", amount: "-30" }),
        createTransaction({
          id: "categorized-income",
          amount: "900",
          currency: "USD",
          category: internalTransferCategory
        }),
        createTransaction({
          id: "categorized-expense",
          amount: "-800",
          currency: "USD",
          category: internalTransferCategory
        }),
        createTransaction({
          id: "detected-income",
          amount: "700",
          currency: "USD",
          cashflow_type: "internal_transfer"
        }),
        createTransaction({
          id: "detected-expense",
          amount: "-600",
          currency: "USD",
          cashflow_type: "internal_transfer"
        })
      ]
    });

    expect(summary.currency).toBe("EUR");
    expect(summary.transactionCount).toBe(2);
    expect(summary.points[6]).toEqual({
      month: 7,
      monthLabel: "Jul",
      income: 100,
      expenses: 30
    });
    expect(
      summary.points
        .filter((point) => point.month !== 7)
        .every((point) => point.income === 0 && point.expenses === 0)
    ).toBe(true);
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
  slug: string
): NonNullable<MonthlyTransactionSummary["category"]> {
  return {
    id: slug,
    name: "Transferencia interna",
    slug,
    group: {
      id: "transfers",
      name: "Transferencias y ahorro"
    }
  };
}
