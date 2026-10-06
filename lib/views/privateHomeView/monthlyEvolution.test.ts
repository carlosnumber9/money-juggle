import type { MonthlyTransactionSummary } from "@/definitions";
import { describe, expect, it } from "vitest";

import { buildMonthlyEvolutionSummary } from "./monthlyEvolution";

describe("buildMonthlyEvolutionSummary", () => {
  it("nets refunds across accounts in the same category without offsetting other categories", () => {
    const restaurants = createCategory("restaurants");
    const summary = buildMonthlyEvolutionSummary({
      year: 2026,
      transactions: [
        createTransaction({ amount: "-200", category: restaurants }),
        createTransaction({
          amount: "20",
          account_id: "other-account",
          category: restaurants
        }),
        createTransaction({
          amount: "-800",
          category: createCategory("mortgage")
        }),
        createTransaction({
          amount: "1000",
          category: createCategory("salary")
        })
      ]
    });

    expect(summary.points[6]).toMatchObject({ income: 1000, expenses: 980 });
    expect(summary.transactionCount).toBe(4);
  });

  it.each([
    { refund: "200", income: 0, expenses: 0 },
    { refund: "250", income: 50, expenses: 0 }
  ])(
    "reports a category net of zero or income for refund $refund",
    ({ refund, income, expenses }) => {
      const category = createCategory("restaurants");
      const summary = buildMonthlyEvolutionSummary({
        year: 2026,
        transactions: [
          createTransaction({ amount: "-200", category }),
          createTransaction({ amount: refund, category })
        ]
      });

      expect(summary.points[6]).toMatchObject({ income, expenses });
      expect(summary.transactionCount).toBe(2);
    }
  );

  it("keeps category netting inside each reporting month", () => {
    const category = createCategory("restaurants");
    const summary = buildMonthlyEvolutionSummary({
      year: 2026,
      transactions: [
        createTransaction({ amount: "-200", category }),
        createTransaction({
          amount: "20",
          booking_date: "2026-07-31",
          reporting_date: "2026-08-01",
          category
        }),
        createTransaction({
          amount: "500",
          reporting_date: "2025-07-15",
          category
        })
      ]
    });

    expect(summary.points[6]).toMatchObject({ income: 0, expenses: 200 });
    expect(summary.points[7]).toMatchObject({ income: 20, expenses: 0 });
    expect(summary.transactionCount).toBe(2);
  });

  it("nets income reversals and preserves separate uncategorized movements", () => {
    const salary = createCategory("salary");
    const summary = buildMonthlyEvolutionSummary({
      year: 2026,
      transactions: [
        createTransaction({ amount: "1000", category: salary }),
        createTransaction({ amount: "-100", category: salary }),
        createTransaction({ amount: "-80" }),
        createTransaction({ amount: "20" })
      ]
    });

    expect(summary.points[6]).toMatchObject({ income: 920, expenses: 80 });
  });

  it("nets reportable reconciliation differences with exact decimals and excludes original members", () => {
    const category = createCategory("restaurants");
    const summary = buildMonthlyEvolutionSummary({
      year: 2026,
      transactions: [
        createTransaction({ amount: "-200.123456", category }),
        createTransaction({
          amount: "-500",
          category,
          reconciliation: {
            id: "reconciliation",
            differenceTreatment: "reportable",
            requiresReview: false
          }
        }),
        createTransaction({
          amount: "100",
          category,
          cashflow_type: "internal_transfer"
        }),
        createTransaction({ amount: "100", currency: "USD", category }),
        createTransaction({ amount: "0", category })
      ],
      adjustments: [
        {
          reconciliationId: "reconciliation",
          reportingDate: "2026-07-20",
          amount: "20.023455",
          currency: "EUR",
          category,
          labels: []
        }
      ]
    });

    expect(summary.currency).toBe("EUR");
    expect(summary.points[6]).toMatchObject({
      income: 0,
      expenses: 180.100001
    });
    expect(summary.transactionCount).toBe(2);
    expect(summary.excludedInternalTransferCount).toBe(1);
  });

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

  it("nets positive and negative categorized savings movements by month", () => {
    const summary = buildMonthlyEvolutionSummary({
      year: 2026,
      transactions: [
        createTransaction({
          id: "june-savings",
          amount: "100",
          reporting_date: "2026-06-10",
          category: createSavingsCategory()
        }),
        createTransaction({
          id: "july-savings",
          amount: "200",
          cashflow_type: "internal_transfer",
          category: createSavingsCategory()
        }),
        createTransaction({
          id: "august-savings",
          amount: "300",
          reporting_date: "2026-08-10",
          category: createSavingsCategory(),
          reconciliation: {
            id: "reconciliation",
            differenceTreatment: "neutralized",
            requiresReview: false
          }
        }),
        createTransaction({
          id: "september-savings",
          amount: "400",
          reporting_date: "2026-09-10",
          category: createSavingsCategory()
        }),
        createTransaction({
          id: "negative-counterpart",
          amount: "-600",
          reporting_date: "2026-09-20",
          category: createSavingsCategory()
        }),
        createTransaction({ id: "other-income", amount: "500" })
      ],
      adjustments: [
        {
          reconciliationId: "adjustment",
          reportingDate: "2026-08-20",
          amount: "500",
          currency: "EUR",
          category: createSavingsCategory(),
          labels: []
        }
      ]
    });

    expect(summary.savingsCurrency).toBe("EUR");
    expect(summary.points[5]).toMatchObject({ savings: 100 });
    expect(summary.points[6]).toMatchObject({ savings: 200 });
    expect(summary.points[7]).toMatchObject({ savings: 300 });
    expect(summary.points[8]).toMatchObject({
      income: 0,
      expenses: 600,
      savings: -200
    });
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

function createCategory(id: string) {
  return {
    id,
    name: id,
    slug: id,
    group: { id: "group", name: "Grupo" }
  };
}

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
