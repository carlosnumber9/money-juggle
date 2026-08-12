import type { BankConnectionSummary } from "@/definitions";
import { describe, expect, it } from "vitest";

import { buildBalanceTotals } from "./balanceTotals";

describe("buildBalanceTotals", () => {
  it("sums one selected cash balance per linked account and currency", () => {
    const connection = createConnection([
      createAccount("cash-1", "120.50"),
      createAccount("cash-2", "30.25")
    ]);

    expect(buildBalanceTotals(connection)).toEqual([
      {
        amount: "150.75",
        currency: "EUR",
        fetchedAt: "2026-08-12T10:00:00.000Z"
      }
    ]);
  });
});

function createConnection(
  accounts: BankConnectionSummary["accounts"]
): BankConnectionSummary {
  return {
    id: "connection",
    status: "linked",
    consent_expires_at: "2026-11-10T10:00:00.000Z",
    created_at: "2026-08-12T10:00:00.000Z",
    updated_at: "2026-08-12T10:00:00.000Z",
    institution: {
      name: "Trade Republic",
      country: "ES",
      logo_url: null
    },
    accounts
  };
}

function createAccount(
  id: string,
  amount: string
): BankConnectionSummary["accounts"][number] {
  return {
    id,
    name: "Cuenta corriente",
    currency: "EUR",
    iban_last4: "1234",
    account_type: "CACC",
    status: "active",
    latest_balance: {
      balance_type: "CLBD",
      amount,
      currency: "EUR",
      reference_date: "2026-08-12",
      fetched_at: "2026-08-12T10:00:00.000Z"
    }
  };
}
