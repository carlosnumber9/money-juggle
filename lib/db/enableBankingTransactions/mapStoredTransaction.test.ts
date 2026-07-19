import { describe, expect, it } from "vitest";

import { mapStoredTransactionToSummary } from "./mapStoredTransaction";
import type { StoredMonthlyTransactionRow } from "./types";

describe("mapStoredTransactionToSummary labels", () => {
  it("maps labels in assignment order and ignores missing joined labels", () => {
    const summary = mapStoredTransactionToSummary({
      ...createStoredTransaction(),
      transaction_label_assignments: [
        {
          created_at: "2026-07-19T12:00:00.000Z",
          transaction_labels: {
            id: "60000000-0000-4000-8000-000000000002",
            name: "Segunda"
          }
        },
        {
          created_at: "2026-07-19T10:00:00.000Z",
          transaction_labels: [
            {
              id: "60000000-0000-4000-8000-000000000001",
              name: "Primera"
            }
          ]
        },
        {
          created_at: "2026-07-19T09:00:00.000Z",
          transaction_labels: null
        }
      ]
    });

    expect(summary.labels).toEqual([
      { id: "60000000-0000-4000-8000-000000000001", name: "Primera" },
      { id: "60000000-0000-4000-8000-000000000002", name: "Segunda" }
    ]);
  });

  it("maps a transaction without assignments as unlabeled", () => {
    expect(
      mapStoredTransactionToSummary(createStoredTransaction()).labels
    ).toEqual([]);
  });
});

function createStoredTransaction(): StoredMonthlyTransactionRow {
  return {
    id: "40000000-0000-4000-8000-000000000001",
    account_id: "20000000-0000-4000-8000-000000000001",
    booking_status: "booked",
    booking_date: "2026-07-19",
    amount: "-10.00",
    currency: "EUR",
    description: "Movimiento",
    merchant_name: null,
    counterparty_name: null,
    counterparty_account_last4: null,
    counterparty_account_fingerprint: null,
    category_id: null,
    transaction_categories: null,
    transaction_label_assignments: [],
    accounts: {
      id: "20000000-0000-4000-8000-000000000001",
      name: "Cuenta",
      iban_last4: "1234",
      iban_fingerprint: null,
      bank_connections: {
        institutions: {
          provider_institution_id: "ES:TEST",
          name: "Banco"
        }
      }
    }
  };
}
