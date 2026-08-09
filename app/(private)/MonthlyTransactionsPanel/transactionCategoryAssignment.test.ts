import { describe, expect, it } from "vitest";

import type {
  MonthlyTransactionCategory,
  MonthlyTransactionSummary
} from "@/definitions";

import { updateTransactionCategoryInList } from "./transactionCategoryAssignment";
import {
  DEFAULT_TRANSACTION_FILTERS,
  filterMonthlyTransactions
} from "./transactionFilters";

const TRANSACTION: MonthlyTransactionSummary = {
  id: "transaction-id",
  institution_slug: "ing",
  institution_name: "ING",
  institution_provider_id: null,
  account_id: "account-id",
  account_name: "Cuenta corriente",
  account_iban_last4: "1234",
  booking_status: "booked",
  booking_date: "2026-08-03",
  reporting_date: "2026-08-03",
  cashflow_type: "external",
  amount: "-10.00",
  currency: "EUR",
  description: "Compra",
  merchant_name: null,
  counterparty_name: null,
  category: null,
  labels: []
};

const CATEGORY: MonthlyTransactionCategory = {
  id: "category-id",
  name: "Supermercado",
  slug: "groceries",
  group: {
    id: "group-id",
    name: "Alimentación"
  }
};

describe("live transaction category assignment", () => {
  it("removes a newly categorized transaction from the uncategorized filter", () => {
    const updatedTransactions = updateTransactionCategoryInList(
      [TRANSACTION],
      TRANSACTION.id,
      CATEGORY
    );

    expect(
      filterMonthlyTransactions(updatedTransactions, {
        ...DEFAULT_TRANSACTION_FILTERS,
        showUncategorized: true
      })
    ).toEqual([]);
  });

  it("restores the previous filter result when an optimistic update rolls back", () => {
    const categorizedTransactions = updateTransactionCategoryInList(
      [TRANSACTION],
      TRANSACTION.id,
      CATEGORY
    );
    const rolledBackTransactions = updateTransactionCategoryInList(
      categorizedTransactions,
      TRANSACTION.id,
      null
    );

    expect(
      filterMonthlyTransactions(rolledBackTransactions, {
        ...DEFAULT_TRANSACTION_FILTERS,
        showUncategorized: true
      })
    ).toEqual([{ ...TRANSACTION, category: null }]);
  });
});
