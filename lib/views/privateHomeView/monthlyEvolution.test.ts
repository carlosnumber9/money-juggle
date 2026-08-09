import type { MonthlyTransactionSummary } from "@/definitions";
import { describe, expect, it } from "vitest";

import { buildMonthlyEvolutionSummary } from "./monthlyEvolution";

describe("buildMonthlyEvolutionSummary", () => {
  it("excludes internal transfers before choosing the report currency", () => {
    const summary = buildMonthlyEvolutionSummary({
      year: 2026,
      transactions: [
        createTransaction({ id: "expense", amount: "-40" }),
        createTransaction({
          id: "categorized-transfer",
          amount: "-100",
          currency: "USD",
          category: createInternalTransferCategory()
        }),
        createTransaction({
          id: "detected-transfer",
          amount: "100",
          currency: "USD",
          cashflow_type: "internal_transfer"
        })
      ]
    });

    expect(summary.currency).toBe("EUR");
    expect(summary.points[6]).toMatchObject({ income: 0, expenses: 40 });
    expect(summary.transactionCount).toBe(1);
  });

  it("assigns movements to months using the reporting date", () => {
    const summary = buildMonthlyEvolutionSummary({
      year: 2026,
      transactions: [
        createTransaction({
          booking_date: "2026-07-31",
          reporting_date: "2026-08-01",
          amount: "-25"
        })
      ]
    });

    expect(summary.points[6]).toMatchObject({ income: 0, expenses: 0 });
    expect(summary.points[7]).toMatchObject({ income: 0, expenses: 25 });
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
    reporting_date: "2026-07-15",
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
