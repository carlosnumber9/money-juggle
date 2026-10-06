import "server-only";

import { type AppUser, type BankingDataSource } from "@/definitions";
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
  getCachedProviderApplication,
  getCachedAvailableInstitutions
} from "@/lib/enableBanking/displayMetadata";
import { getCurrentSupabaseUser } from "@/lib/supabase/currentUser";
import { getMonthlyReportData } from "@/lib/db/monthlyReportData";

export const bankingDataSource: BankingDataSource = {
  async getMonthlyReportData(userId, range) {
    return getMonthlyReportData(userId, range);
  },
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
    return getCachedProviderApplication();
  },
  async listAvailableInstitutions() {
    return getCachedAvailableInstitutions();
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
