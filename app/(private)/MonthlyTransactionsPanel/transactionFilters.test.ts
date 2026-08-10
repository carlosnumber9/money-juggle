import type { MonthlyTransactionSummary } from "@/definitions";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_TRANSACTION_FILTERS,
  filterMonthlyTransactions
} from "./transactionFilters";

describe("monthly transaction direction filters", () => {
  const transactions = [
    createTransaction({ id: "income", amount: "100" }),
    createTransaction({ id: "expense", amount: "-40" }),
    createTransaction({
      id: "detected-transfer",
      amount: "100",
      cashflow_type: "internal_transfer"
    }),
    createTransaction({
      id: "categorized-transfer",
      amount: "-100",
      category: createInternalTransferCategory()
    }),
    createTransaction({
      id: "reconciled-expense",
      amount: "-30",
      reconciliation: {
        id: "reconciliation",
        differenceTreatment: "neutralized",
        requiresReview: false
      }
    })
  ];

  it("keeps internal transfers visible without a direction filter", () => {
    expect(
      filterMonthlyTransactions(transactions, DEFAULT_TRANSACTION_FILTERS).map(
        (transaction) => transaction.id
      )
    ).toEqual([
      "income",
      "expense",
      "detected-transfer",
      "categorized-transfer",
      "reconciled-expense"
    ]);
  });

  it("excludes internal transfers from the income filter", () => {
    expect(
      filterMonthlyTransactions(transactions, {
        ...DEFAULT_TRANSACTION_FILTERS,
        activeChipFilters: ["income"]
      }).map((transaction) => transaction.id)
    ).toEqual(["income"]);
  });

  it("excludes internal transfers from the expense filter", () => {
    expect(
      filterMonthlyTransactions(transactions, {
        ...DEFAULT_TRANSACTION_FILTERS,
        activeChipFilters: ["expense"]
      }).map((transaction) => transaction.id)
    ).toEqual(["expense"]);
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
