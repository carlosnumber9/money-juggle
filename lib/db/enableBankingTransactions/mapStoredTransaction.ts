import type { MonthlyTransactionSummary } from "@/definitions";

import { getInstitutionSlug } from "./institutionSlug";
import type { StoredMonthlyTransactionRow } from "./types";

export function mapStoredTransactionToSummary(
  row: StoredMonthlyTransactionRow,
  cashflowType: MonthlyTransactionSummary["cashflow_type"] = "external",
  reconciliation: MonthlyTransactionSummary["reconciliation"] = null
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
  const labelAssignments = Array.isArray(row.transaction_label_assignments)
    ? row.transaction_label_assignments
    : row.transaction_label_assignments
      ? [row.transaction_label_assignments]
      : [];

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
    reporting_date: row.reporting_date,
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
            slug: category.slug,
            group: {
              id: categoryGroup.id,
              name: categoryGroup.name
            }
          }
        : null,
    labels: labelAssignments
      .map((assignment) => ({
        createdAt: assignment.created_at,
        label: Array.isArray(assignment.transaction_labels)
          ? (assignment.transaction_labels[0] ?? null)
          : assignment.transaction_labels
      }))
      .filter(
        (
          assignment
        ): assignment is {
          createdAt: string;
          label: { id: string; name: string };
        } => Boolean(assignment.label)
      )
      .sort(
        (left, right) =>
          left.createdAt.localeCompare(right.createdAt) ||
          left.label.name.localeCompare(right.label.name)
      )
      .map(({ label }) => label),
    reconciliation
  };
}
