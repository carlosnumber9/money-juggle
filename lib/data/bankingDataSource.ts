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
