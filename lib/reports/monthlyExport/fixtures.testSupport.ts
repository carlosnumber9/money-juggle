import type {
  MonthlyReportData,
  MonthlyTransactionCategory,
  MonthlyTransactionSummary
} from "@/definitions";

export const REPORT_NOW = new Date("2026-10-05T10:30:00Z");
export const REPORT_MONTH = "2026-09";

export function reportCategory(
  slug = "restaurants_bars",
  income = false
): MonthlyTransactionCategory {
  return {
    id: `category-${slug}`,
    name: slug === "restaurants_bars" ? "Restaurantes y bares" : slug,
    slug,
    group: {
      id: income ? "income-group" : "expense-group",
      name: income ? "Ingresos" : "Gastos"
    }
  };
}

export function reportTransaction(
  overrides: Partial<MonthlyTransactionSummary> = {}
): MonthlyTransactionSummary {
  return {
    id: "secret-transaction-id",
    institution_slug: "ing",
    institution_name: "ING",
    institution_provider_id: "provider-secret",
    account_id: "account-a",
    account_name: "Principal",
    account_iban_last4: "1234",
    booking_status: "booked",
    booking_date: "2026-09-10",
    reporting_date: "2026-09-10",
    cashflow_type: "external",
    amount: "-100",
    currency: "EUR",
    description: "secret-purchase-description",
    merchant_name: "secret-merchant",
    counterparty_name: "secret-counterparty",
    category: reportCategory(),
    labels: [],
    reconciliation: null,
    ...overrides
  };
}

export function reportData(
  overrides: Partial<MonthlyReportData> = {}
): MonthlyReportData {
  return {
    accounts: [
      {
        id: "account-a",
        name: "Principal",
        institution: "ING",
        currency: "EUR",
        status: "active",
        connectionId: "connection-a"
      }
    ],
    transactions: [],
    adjustments: [],
    balances: [],
    categoryGroups: [
      { id: "income-group", name: "Ingresos", slug: "income", categories: [] }
    ],
    syncs: [
      {
        connectionId: "connection-a",
        finishedAt: "2026-10-01T08:00:00Z",
        status: "succeeded"
      }
    ],
    unavailableAdjustmentCount: 0,
    ...overrides
  };
}
