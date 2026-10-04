import "server-only";

import {
  INITIAL_BANK_NAMES,
  type AppUser,
  type BankingDataSource,
  type InstitutionAvailability,
  type ProviderApplication
} from "@/definitions";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { listUserEnableBankingConnections } from "@/lib/db/enableBankingConnections";
import { loadBankAccountReview } from "@/lib/db/enableBankingConnections/accountReview";
import {
  listCompletedTransactionBackfillConnectionIds,
  listMonthlyTransactions
} from "@/lib/db/enableBankingTransactions";
import { listTransactionCategoryGroups } from "@/lib/db/transactionCategories";
import { listTransactionLabels } from "@/lib/db/transactionLabels";
import { listTransactionReconciliationAdjustments } from "@/lib/db/transactionReconciliations";
import {
  getEnableBankingApplication,
  getEnableBankingAspsps
} from "@/lib/enableBanking/client";
import { getCurrentSupabaseUser } from "@/lib/supabase/currentUser";

export const bankingDataSource: BankingDataSource = {
  async getCurrentUser() {
    const user = await getCurrentSupabaseUser();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? null,
      isAllowed: isEmailAllowed(user.email)
    } satisfies AppUser;
  },
  async getProviderApplication() {
    const application = await getEnableBankingApplication();

    return {
      name: application.name,
      kid: application.kid,
      environment: application.environment,
      active: application.active,
      countries: application.countries,
      services: application.services
    } satisfies ProviderApplication;
  },
  async listAvailableInstitutions() {
    const aspsps = await getEnableBankingAspsps({
      country: "ES",
      psuType: "personal",
      service: "AIS"
    });

    return aspsps
      .filter((aspsp) =>
        INITIAL_BANK_NAMES.some((bankName) =>
          aspsp.name.toLowerCase().includes(bankName.toLowerCase())
        )
      )
      .map((aspsp): InstitutionAvailability => ({
        name: aspsp.name,
        country: aspsp.country,
        logo: aspsp.logo,
        beta: aspsp.beta,
        maximumConsentValidity: aspsp.maximum_consent_validity
      }));
  },
  async listBankConnections(userId: string) {
    return listUserEnableBankingConnections(userId);
  },
  async getBankAccountReview(userId, bankConnectionId) {
    const review = await loadBankAccountReview(userId, bankConnectionId);
    if (!review) return null;
    return {
      reviewId: review.pending.reviewId,
      institutionName: review.pending.session.aspsp.name,
      expiresAt: review.pending.expiresAt,
      returnedAccounts: review.pending.session.accounts.map(
        (account, index) => ({
          name:
            account.name ?? account.product ?? `Cuenta autorizada ${index + 1}`,
          currency: account.currency ?? "EUR",
          ibanLast4: review.pending.identifiers[index].iban_last4
        })
      ),
      storedAccounts: (review.connection.accounts ?? []).map((account) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
        ibanLast4: account.iban_last4
      }))
    };
  },
  async listCompletedTransactionBackfillConnectionIds(userId) {
    return [...(await listCompletedTransactionBackfillConnectionIds(userId))];
  },
  async listMonthlyTransactions(userId, range) {
    return listMonthlyTransactions({ userId, range });
  },
  async listTransactionReconciliationAdjustments(userId, range) {
    return listTransactionReconciliationAdjustments({ userId, range });
  },
  async listTransactionCategoryGroups(userId) {
    return listTransactionCategoryGroups({ userId });
  },
  async listTransactionLabels(userId) {
    return listTransactionLabels({ userId });
  }
};
