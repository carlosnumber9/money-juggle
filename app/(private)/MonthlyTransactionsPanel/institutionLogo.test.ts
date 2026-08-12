import type { MonthlyTransactionSummary } from "@/definitions";
import { describe, expect, it } from "vitest";

import { getInstitutionLogo } from "./institutionLogo";

describe("getInstitutionLogo", () => {
  it("uses the Trade Republic asset and theme color", () => {
    expect(getInstitutionLogo(createTradeRepublicTransaction())).toMatchObject({
      color: "var(--bank-color-trade-republic)",
      fallback: "T",
      label: "Trade Republic",
      path: "/assets/institutions/trade-republic.svg"
    });
  });
});

function createTradeRepublicTransaction(): MonthlyTransactionSummary {
  return {
    id: "transaction",
    institution_slug: "trade-republic",
    institution_name: "Trade Republic",
    institution_provider_id: "ES:Trade Republic",
    account_id: "account",
    account_name: "Cuenta corriente",
    account_iban_last4: "1234",
    booking_status: "booked",
    booking_date: "2026-08-12",
    reporting_date: "2026-08-12",
    cashflow_type: "external",
    amount: "10.00",
    currency: "EUR",
    description: "Intereses",
    merchant_name: null,
    counterparty_name: null,
    category: null,
    labels: []
  };
}
