import type { MonthlyTransactionSummary } from "@/definitions";
import { describe, expect, it } from "vitest";

import { buildAnnualLabelExpensesSummary } from "./annualLabelExpenses";

describe("buildAnnualLabelExpensesSummary", () => {
  it("groups current-year expenses by label and sorts by amount", () => {
    const summary = buildAnnualLabelExpensesSummary({
      year: 2026,
      transactions: [
        createTransaction({
          id: "first",
          amount: "-25.50",
          labels: [{ id: "travel", name: "Viaje" }]
        }),
        createTransaction({
          id: "second",
          amount: "-40",
          labels: [{ id: "shared", name: "Compartidos" }]
        }),
        createTransaction({
          id: "third",
          amount: "-10",
          labels: [{ id: "travel", name: "Viaje" }]
        })
      ]
    });

    expect(summary).toEqual({
      year: 2026,
      currency: "EUR",
      points: [
        {
          labelId: "shared",
          labelName: "Compartidos",
          expenses: 40,
          transactionCount: 1
        },
        {
          labelId: "travel",
          labelName: "Viaje",
          expenses: 35.5,
          transactionCount: 2
        }
      ],
      totalExpenses: 75.5,
      transactionCount: 3
    });
  });

  it("excludes unlabeled expenses, income, internal transfers, and other years", () => {
    const summary = buildAnnualLabelExpensesSummary({
      year: 2026,
      transactions: [
        createTransaction({ id: "unlabeled", labels: [] }),
        createTransaction({
          id: "income",
          amount: "100",
          labels: [{ id: "travel", name: "Viaje" }]
        }),
        createTransaction({
          id: "transfer",
          cashflow_type: "internal_transfer",
          labels: [{ id: "travel", name: "Viaje" }]
        }),
        createTransaction({
          id: "previous-year",
          booking_date: "2025-12-31",
          labels: [{ id: "travel", name: "Viaje" }]
        })
      ]
    });

    expect(summary.points).toEqual([]);
    expect(summary.totalExpenses).toBe(0);
    expect(summary.transactionCount).toBe(0);
  });

  it("adds a multi-label expense to every assigned label only once", () => {
    const summary = buildAnnualLabelExpensesSummary({
      year: 2026,
      transactions: [
        createTransaction({
          amount: "-15",
          labels: [
            { id: "travel", name: "Viaje" },
            { id: "shared", name: "Compartidos" }
          ]
        })
      ]
    });

    expect(summary.points).toEqual([
      {
        labelId: "shared",
        labelName: "Compartidos",
        expenses: 15,
        transactionCount: 1
      },
      {
        labelId: "travel",
        labelName: "Viaje",
        expenses: 15,
        transactionCount: 1
      }
    ]);
    expect(summary.totalExpenses).toBe(15);
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
