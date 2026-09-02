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

  it("sums categorized savings charges regardless of report neutrality", () => {
    const summary = buildMonthlyEvolutionSummary({
      year: 2026,
      transactions: [
        createTransaction({
          id: "july-savings",
          amount: "-100",
          category: createSavingsCategory()
        }),
        createTransaction({
          id: "august-savings",
          amount: "-50",
          reporting_date: "2026-08-10",
          category: createSavingsCategory()
        }),
        createTransaction({
          id: "savings-income",
          amount: "500",
          category: createSavingsCategory()
        }),
        createTransaction({ id: "other-expense", amount: "-20" }),
        createTransaction({
          id: "internal-savings",
          amount: "-25",
          cashflow_type: "internal_transfer",
          category: createSavingsCategory()
        }),
        createTransaction({
          id: "reconciled-savings",
          amount: "-25",
          reporting_date: "2026-08-15",
          category: createSavingsCategory(),
          reconciliation: {
            id: "reconciliation",
            differenceTreatment: "neutralized",
            requiresReview: false
          }
        })
      ],
      adjustments: [
        {
          reconciliationId: "adjustment",
          reportingDate: "2026-08-20",
          amount: "-500",
          currency: "EUR",
          category: createSavingsCategory(),
          labels: []
        }
      ]
    });

    expect(summary.savingsCurrency).toBe("EUR");
    expect(summary.points[6]).toMatchObject({ savings: 125 });
    expect(summary.points[7]).toMatchObject({ savings: 75 });
  });

  it("excludes savings transfers from income and currency selection", () => {
    const summary = buildMonthlyEvolutionSummary({
      year: 2026,
      transactions: [
        createTransaction({ id: "income", amount: "100" }),
        createTransaction({
          id: "savings-income",
          amount: "50",
          category: createSavingsCategory()
        }),
        createTransaction({
          id: "usd-savings-income-1",
          amount: "500",
          currency: "USD",
          category: createSavingsCategory()
        }),
        createTransaction({
          id: "usd-savings-income-2",
          amount: "600",
          currency: "USD",
          category: createSavingsCategory()
        })
      ]
    });

    expect(summary.currency).toBe("EUR");
    expect(summary.points[6]).toMatchObject({ income: 100, expenses: 0 });
    expect(summary.transactionCount).toBe(1);
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

function createSavingsCategory() {
  return {
    id: "savings-transfer",
    name: "Ahorro",
    slug: "savings_transfer",
    group: {
      id: "transfers",
      name: "Transferencias y ahorro"
    }
  };
}
