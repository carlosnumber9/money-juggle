import type { MonthlyTransactionSummary } from "@/definitions";

import { getInstitutionSlug } from "./institution-slug";
import type { StoredMonthlyTransactionRow } from "./types";

export function mapStoredTransactionToSummary(
  row: StoredMonthlyTransactionRow
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
    amount: String(row.amount),
    currency: row.currency,
    description: row.description,
    merchant_name: row.merchant_name,
    counterparty_name: row.counterparty_name
  };
}
