import type { StoredMonthlyTransactionRow } from "./types";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getInternalTransferTransactionIds } from "./internalTransfers";

describe("getInternalTransferTransactionIds", () => {
  it("pairs fallback transfers whose booking dates cross a month boundary", () => {
    const rows = [
      createTransaction({
        id: "outgoing",
        accountId: "source",
        accountLast4: "1111",
        counterpartyLast4: "2222",
        bookingDate: "2026-05-31",
        amount: "-150"
      }),
      createTransaction({
        id: "incoming",
        accountId: "destination",
        accountLast4: "2222",
        counterpartyLast4: "1111",
        bookingDate: "2026-06-01",
        amount: "150"
      })
    ];

    expect(
      getInternalTransferTransactionIds(rows, [
        { id: "source", iban_last4: "1111", iban_fingerprint: null },
        { id: "destination", iban_last4: "2222", iban_fingerprint: null }
      ])
    ).toEqual(new Set(["outgoing", "incoming"]));
  });
});

function createTransaction({
  id,
  accountId,
  accountLast4,
  counterpartyLast4,
  bookingDate,
  amount
}: {
  id: string;
  accountId: string;
  accountLast4: string;
  counterpartyLast4: string;
  bookingDate: string;
  amount: string;
}): StoredMonthlyTransactionRow {
  return {
    id,
    account_id: accountId,
    booking_status: "booked",
    booking_date: bookingDate,
    amount,
    currency: "EUR",
    description: null,
    merchant_name: null,
    counterparty_name: null,
    counterparty_account_last4: counterpartyLast4,
    counterparty_account_fingerprint: null,
    category_id: null,
    transaction_categories: null,
    transaction_label_assignments: null,
    accounts: {
      id: accountId,
      name: "Cuenta",
      iban_last4: accountLast4,
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
