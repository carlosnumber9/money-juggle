import type { MonthlyTransactionSummary } from "@/definitions";
import { describe, expect, it } from "vitest";

import { buildMonthlyCashflowSummary } from "./monthlyCashflow";

describe("buildMonthlyCashflowSummary", () => {
  it("excludes detected and manually categorized internal transfers", () => {
    const summary = buildMonthlyCashflowSummary([
      createTransaction({ id: "income", amount: "100" }),
      createTransaction({ id: "expense", amount: "-40" }),
      createTransaction({
        id: "detected-transfer",
        amount: "50",
        cashflow_type: "internal_transfer"
      }),
      createTransaction({
        id: "categorized-transfer",
        amount: "-50",
        category: createInternalTransferCategory()
      })
    ]);

    expect(summary.income.totals).toEqual([
      { amount: "100", currency: "EUR", transactionCount: 1 }
    ]);
    expect(summary.expenses.totals).toEqual([
      { amount: "40", currency: "EUR", transactionCount: 1 }
    ]);
    expect(summary.income.excludedInternalTransferCount).toBe(1);
    expect(summary.expenses.excludedInternalTransferCount).toBe(1);
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

function createInternalTransferCategory() {
  return {
    id: "internal-transfer",
    name: "Transferencia interna",
    slug: "internal_transfer",
    group: {
      id: "transfers",
      name: "Transferencias y ahorro"
    }
  };
}
