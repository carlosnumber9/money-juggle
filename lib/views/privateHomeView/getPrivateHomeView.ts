import "server-only";

import type { PrivateHomeView, ProviderStatusView } from "@/definitions";
import { getBankingDataSource } from "@/lib/data/getBankingDataSource";
import { getCurrentMonthTransactionRange } from "@/lib/domain/transactionRanges";

import { buildBankCards } from "./buildBankCards";
import { loadConnections } from "./loadConnections";
import {
  loadInstitutions,
  loadMonthlyTransactions,
  loadProviderStatus,
  loadTransactionCategoryGroups
} from "./loaders";
import { buildMonthlyCashflowSummary } from "./monthlyCashflow";

export async function getPrivateHomeView(): Promise<PrivateHomeView> {
  const dataSource = getBankingDataSource();
  const user = await dataSource.getCurrentUser();

  if (!user) {
    return { kind: "unauthenticated" };
  }

  if (!user.isAllowed) {
    return { kind: "forbidden" };
  }

  const transactionRange = getCurrentMonthTransactionRange();
  const [
    connectionsResult,
    providerResult,
    transactionsResult,
    categoryGroupsResult
  ] = await Promise.all([
    loadConnections(dataSource, user.id),
    loadProviderStatus(dataSource),
    loadMonthlyTransactions(dataSource, user.id, transactionRange),
    loadTransactionCategoryGroups(dataSource, user.id)
  ]);
  const providerStatus = getProviderStatus(providerResult, dataSource.mode);
  const institutionsResult =
    providerStatus.status === "success"
      ? await loadInstitutions(dataSource)
      : undefined;

  return {
    kind: "ready",
    user: { email: user.email },
    providerStatus,
    bankCards: buildBankCards({
      connectionsResult,
      institutionsResult,
      providerStatus
    }),
    monthlyCashflow: buildMonthlyCashflowSummary(
      transactionsResult.ok ? transactionsResult.value : []
    ),
    monthlyTransactions: {
      range: transactionRange,
      rows: transactionsResult.ok ? transactionsResult.value : [],
      categoryGroups: categoryGroupsResult.ok ? categoryGroupsResult.value : [],
      error: getMonthlyTransactionsError(
        transactionsResult,
        categoryGroupsResult
      )
    }
  };
}

function getMonthlyTransactionsError(
  transactionsResult: Awaited<ReturnType<typeof loadMonthlyTransactions>>,
  categoryGroupsResult: Awaited<
    ReturnType<typeof loadTransactionCategoryGroups>
  >
): string | null {
  if (!transactionsResult.ok) {
    return transactionsResult.reason;
  }

  if (!categoryGroupsResult.ok) {
    return categoryGroupsResult.reason;
  }

  return null;
}

function getProviderStatus(
  providerResult: Awaited<ReturnType<typeof loadProviderStatus>>,
  mode: "demo" | "real"
): ProviderStatusView {
  return providerResult.ok
    ? providerResult.value
    : {
        status: "error",
        reason: providerResult.reason,
        isDemo: mode === "demo"
      };
}
