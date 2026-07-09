import type { MonthlyTransactionSummary } from "@/definitions";

import { getInstitutionSlug } from "./institutionSlug";
import type { StoredMonthlyTransactionRow } from "./types";

export function mapStoredTransactionToSummary(
  row: StoredMonthlyTransactionRow,
  cashflowType: MonthlyTransactionSummary["cashflow_type"] = "external"
): MonthlyTransactionSummary {
  const account = Array.isArray(row.accounts)
    ? (row.accounts[0] ?? null)
    : row.accounts;
  const bankConnection = Array.isArray(account?.bank_connections)
    ? (account.bank_connections[0] ?? null)
    : account?.bank_connections;
  const institution = Array.isArray(bankConnection?.institutions)
    ? (bankConnection.institutions[0] ?? null)
    : bankConnection?.institutions;
  const institutionName = institution?.name ?? "Cuenta";
  const institutionProviderId = institution?.provider_institution_id ?? null;
  const category = Array.isArray(row.transaction_categories)
    ? (row.transaction_categories[0] ?? null)
    : row.transaction_categories;
  const categoryGroup = Array.isArray(category?.transaction_category_groups)
    ? (category.transaction_category_groups[0] ?? null)
    : category?.transaction_category_groups;

  return {
    id: row.id,
    institution_slug: getInstitutionSlug(
      institutionProviderId ?? institutionName
    ),
    institution_name: institutionName,
    institution_provider_id: institutionProviderId,
    account_id: row.account_id,
    account_name: account?.name ?? "Cuenta",
    account_iban_last4: account?.iban_last4 ?? null,
    booking_status: row.booking_status,
    booking_date: row.booking_date,
    cashflow_type: cashflowType,
    amount: String(row.amount),
    currency: row.currency,
    description: row.description,
    merchant_name: row.merchant_name,
    counterparty_name: row.counterparty_name,
    category:
      category && categoryGroup
        ? {
            id: category.id,
            name: category.name,
            group: {
              id: categoryGroup.id,
              name: categoryGroup.name
            }
          }
        : null
  };
}
