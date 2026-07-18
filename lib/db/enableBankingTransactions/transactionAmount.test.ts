import type { EnableBankingTransactionResource } from "@/definitions";
import { describe, expect, it } from "vitest";

import { getTransactionAmount } from "./transactionAmount";

describe("getTransactionAmount", () => {
  it("normalizes debit amounts and currency", () => {
    expect(
      getTransactionAmount({
        transaction_amount: { amount: "+12.50", currency: "eur" },
        credit_debit_indicator: "DBIT"
      })
    ).toEqual({ amount: "-12.50", currency: "EUR" });
  });

  it("normalizes credit amounts", () => {
    expect(
      getTransactionAmount({
        amount: { amount: -25, currency: "EUR" },
        credit_debit_indicator: "CREDIT"
      })
    ).toEqual({ amount: "25", currency: "EUR" });
  });

  it("preserves the provider sign when the indicator is unknown", () => {
    expect(
      getTransactionAmount({
        amount: { amount: "-9.99", currency: "USD" }
      })
    ).toEqual({ amount: "-9.99", currency: "USD" });
  });

  it.each<EnableBankingTransactionResource>([
    {},
    { amount: { amount: "10" } },
    { amount: { amount: "10", currency: "EURO" } },
    { amount: { amount: "", currency: "EUR" } }
  ])("rejects incomplete or invalid amounts", (transaction) => {
    expect(getTransactionAmount(transaction)).toBeNull();
  });
});
