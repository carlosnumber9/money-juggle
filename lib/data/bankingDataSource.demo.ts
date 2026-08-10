import "server-only";

import {
  type BankingDataSource,
  DEMO_BANK_CONNECTIONS,
  DEMO_INSTITUTIONS,
  DEMO_PROVIDER_APPLICATION,
  DEMO_TRANSACTION_CATEGORY_GROUPS,
  DEMO_TRANSACTION_LABELS,
  DEMO_TRANSACTIONS,
  DEMO_USER
} from "@/definitions";

export const demoBankingDataSource: BankingDataSource = {
  mode: "demo",
  async getCurrentUser() {
    return DEMO_USER;
  },
  async getProviderApplication() {
    return DEMO_PROVIDER_APPLICATION;
  },
  async listAvailableInstitutions() {
    return DEMO_INSTITUTIONS;
  },
  async listBankConnections() {
    return DEMO_BANK_CONNECTIONS;
  },
  async listCompletedTransactionBackfillConnectionIds() {
    return [];
  },
  async listMonthlyTransactions(_userId, range) {
    return DEMO_TRANSACTIONS.filter(
      (transaction) =>
        transaction.bookingDate >= range.from &&
        transaction.bookingDate < range.to
    ).map((transaction) => {
      const account = DEMO_BANK_CONNECTIONS.flatMap(
        (connection) => connection.accounts
      ).find((candidate) => candidate.id === transaction.accountId);
      const connection = DEMO_BANK_CONNECTIONS.find((candidate) =>
        candidate.accounts.some((item) => item.id === transaction.accountId)
      );
      const institutionName = connection?.institution?.name ?? "Cuenta";
      const category = getDemoTransactionCategory(transaction.categorySlug);

      return {
        id: transaction.id,
        institution_slug: getInstitutionSlug(institutionName),
        institution_name: institutionName,
        institution_provider_id: connection?.institution
          ? `ES:${connection.institution.name}`
          : null,
        account_id: transaction.accountId,
        account_name: account?.name ?? "Cuenta",
        account_iban_last4: account?.iban_last4 ?? null,
        booking_status: transaction.bookingStatus,
        booking_date: transaction.bookingDate,
        reporting_date: transaction.bookingDate,
        cashflow_type: "external",
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        merchant_name: transaction.merchantName,
        counterparty_name: transaction.counterpartyName,
        category,
        labels: transaction.labelIds
          .map((labelId) =>
            DEMO_TRANSACTION_LABELS.find((label) => label.id === labelId)
          )
          .filter((label) => label !== undefined),
        reconciliation: null
      };
    });
  },
  async listTransactionReconciliationAdjustments() {
    return [];
  },
  async listTransactionCategoryGroups() {
    return DEMO_TRANSACTION_CATEGORY_GROUPS;
  },
  async listTransactionLabels() {
    return DEMO_TRANSACTION_LABELS;
  }
};

function getDemoTransactionCategory(categorySlug: string | null) {
  if (!categorySlug) {
    return null;
  }

  for (const group of DEMO_TRANSACTION_CATEGORY_GROUPS) {
    const category = group.categories.find(
      (item) => item.slug === categorySlug
    );

    if (category) {
      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        group: {
          id: group.id,
          name: group.name
        }
      };
    }
  }

  return null;
}

function getInstitutionSlug(
  institutionName: string
): "caixabank" | "ing" | "unknown" {
  const normalized = institutionName.toLowerCase();

  if (normalized.includes("ing")) {
    return "ing";
  }

  if (normalized.includes("caixabank") || normalized.includes("caixa")) {
    return "caixabank";
  }

  return "unknown";
}
