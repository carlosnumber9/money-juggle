import { describe, expect, it } from "vitest";

import type { MonthlyTransactionSummary } from "@/definitions";

import { buildReportingMovementSet } from "./reportingMovements";

function transaction(
  overrides: Partial<MonthlyTransactionSummary>
): MonthlyTransactionSummary {
  return {
    id: "transaction-1",
    institution_slug: "ing",
    institution_name: "ING",
    institution_provider_id: "ING",
    account_id: "account-1",
    account_name: "Cuenta",
    account_iban_last4: "1234",
    booking_status: "booked",
    booking_date: "2026-08-01",
    reporting_date: "2026-08-01",
    cashflow_type: "external",
    amount: "800",
    currency: "EUR",
    description: null,
    merchant_name: null,
    counterparty_name: null,
    category: null,
    labels: [],
    reconciliation: null,
    ...overrides
  };
}

describe("reporting movements", () => {
  it("excludes internal transfers and reconciliation members", () => {
    const result = buildReportingMovementSet({
      transactions: [
        transaction({ id: "normal" }),
        transaction({ id: "internal", cashflow_type: "internal_transfer" }),
        transaction({
          id: "reconciled",
          reconciliation: {
            id: "group",
            differenceTreatment: "neutralized",
            requiresReview: false
          }
        })
      ]
    });

    expect(result.movements.map((movement) => movement.id)).toEqual(["normal"]);
    expect(result.excludedTransactions.map(({ reason }) => reason)).toEqual([
      "internal_transfer",
      "reconciliation"
    ]);
  });

  it("adds a reportable difference once", () => {
    const result = buildReportingMovementSet({
      transactions: [],
      adjustments: [
        {
          reconciliationId: "group",
          reportingDate: "2026-08-10",
          amount: "-0.1",
          currency: "EUR",
          category: {
            id: "category",
            name: "Otros",
            slug: "other_expense",
            group: { id: "group-category", name: "Otros" }
          },
          labels: [{ id: "label", name: "Familia" }]
        }
      ]
    });

    expect(result.movements).toHaveLength(1);
    expect(result.movements[0]).toMatchObject({
      source: "reconciliation_adjustment",
      amount: "-0.1"
    });
  });
});
