import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { mapTransactionToRow } from "./mapTransactionToRow";

describe("mapTransactionToRow reporting date", () => {
  it("initializes the reporting date from the provider booking date", () => {
    const row = mapTransactionToRow({
      userId: "10000000-0000-4000-8000-000000000001",
      account: {
        id: "20000000-0000-4000-8000-000000000001",
        provider_account_id: "provider-account",
        name: "Cuenta",
        iban_last4: "1234",
        iban_fingerprint: null
      },
      transaction: {
        transaction_id: "provider-transaction",
        booking_status: "booked",
        booking_date: "2026-08-09",
        transaction_amount: {
          amount: "-10.00",
          currency: "EUR"
        }
      }
    });

    expect(row).toMatchObject({
      booking_date: "2026-08-09",
      reporting_date: "2026-08-09"
    });
  });

  it("keeps both dates empty when the provider supplies no booking date", () => {
    const row = mapTransactionToRow({
      userId: "10000000-0000-4000-8000-000000000001",
      account: {
        id: "20000000-0000-4000-8000-000000000001",
        provider_account_id: "provider-account",
        name: "Cuenta",
        iban_last4: "1234",
        iban_fingerprint: null
      },
      transaction: {
        transaction_id: "provider-transaction",
        transaction_amount: {
          amount: "-10.00",
          currency: "EUR"
        }
      }
    });

    expect(row).toMatchObject({
      booking_date: null,
      reporting_date: null
    });
  });
});
