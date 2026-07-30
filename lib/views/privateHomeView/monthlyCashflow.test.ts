import type { MonthlyTransactionSummary } from "@/definitions";
import { describe, expect, it } from "vitest";

import { buildMonthlyCashflowSummary } from "./monthlyCashflow";

describe("buildMonthlyCashflowSummary", () => {
  it("excludes internal transfers from totals and transaction counts", () => {
    const internalTransferCategory = createCategory("internal_transfer");
    const summary = buildMonthlyCashflowSummary([
      createTransaction({ amount: "100" }),
      createTransaction({ id: "expense", amount: "-40" }),
      createTransaction({
        id: "categorized-income",
        amount: "500",
        currency: "USD",
        category: internalTransferCategory
      }),
      createTransaction({
        id: "categorized-expense",
        amount: "-200",
        currency: "USD",
        category: internalTransferCategory
      }),
      createTransaction({
        id: "detected-income",
        amount: "700",
        cashflow_type: "internal_transfer"
      }),
      createTransaction({
        id: "detected-expense",
        amount: "-600",
        cashflow_type: "internal_transfer"
      })
    ]);

    expect(summary).toEqual({
      income: {
        totals: [{ amount: "100", currency: "EUR", transactionCount: 1 }],
        transactionCount: 1
      },
      expenses: {
        totals: [{ amount: "40", currency: "EUR", transactionCount: 1 }],
        transactionCount: 1
      }
    });
  });
});

function createTransaction(
  overrides: Partial<MonthlyTransactionSummary> = {}
): MonthlyTransactionSummary {
  return {
    id: "income",
    institution_slug: "ing",
    institution_name: "ING",
    institution_provider_id: "ES:ING",
    account_id: "account",
    account_name: "Cuenta",
    account_iban_last4: "1234",
    booking_status: "booked",
    booking_date: "2026-07-15",
    cashflow_type: "external",
    amount: "0",
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
