import "server-only";

import type { PrivateHomeView, ProviderStatusView } from "@/definitions";
import { getBankingDataSource } from "@/lib/data/getBankingDataSource";
import {
  getCurrentYearTransactionRange,
  getSelectedTransactionMonth
} from "@/lib/domain/transactionRanges";

import { buildBankCards } from "./buildBankCards";
import { loadConnections } from "./loadConnections";
import {
  loadCompletedTransactionBackfillConnectionIds,
  loadInstitutions,
  loadMonthlyTransactions,
  loadProviderStatus,
  loadTransactionCategoryGroups,
  loadTransactionReconciliationAdjustments,
  loadTransactionLabels
} from "./loaders";
import { buildAnnualLabelExpensesSummary } from "./annualLabelExpenses";
import { buildMonthlyCashflowSummary } from "./monthlyCashflow";
import { buildMonthlyCategoryExpensesSummary } from "./monthlyCategoryExpenses";
import { buildMonthlyEvolutionSummary } from "./monthlyEvolution";
import {
  buildTransactionBackfillView,
  getDashboardSyncEnabled
} from "./transactionBackfill";

export async function getPrivateHomeView(
  requestedMonth?: string
): Promise<PrivateHomeView> {
  const dataSource = getBankingDataSource();
  const user = await dataSource.getCurrentUser();

  if (!user) {
    return { kind: "unauthenticated" };
  }

  if (!user.isAllowed) {
    return { kind: "forbidden" };
  }

  const selectedMonth = getSelectedTransactionMonth(requestedMonth);
  const transactionRange = selectedMonth.range;
  const yearlyTransactionRange = getCurrentYearTransactionRange();
  const reportYear = Number(yearlyTransactionRange.from.slice(0, 4));
  const [
    connectionsResult,
    providerResult,
    completedBackfillConnectionIdsResult,
    transactionsResult,
    yearlyTransactionsResult,
    categoryGroupsResult,
    labelsResult,
    monthlyAdjustmentsResult,
    yearlyAdjustmentsResult
  ] = await Promise.all([
    loadConnections(dataSource, user.id),
    loadProviderStatus(dataSource),
    loadCompletedTransactionBackfillConnectionIds(dataSource, user.id),
    loadMonthlyTransactions(dataSource, user.id, transactionRange),
    loadMonthlyTransactions(dataSource, user.id, yearlyTransactionRange),
    loadTransactionCategoryGroups(dataSource, user.id),
    loadTransactionLabels(dataSource, user.id),
    loadTransactionReconciliationAdjustments(
      dataSource,
      user.id,
      transactionRange
    ),
    loadTransactionReconciliationAdjustments(
      dataSource,
      user.id,
      yearlyTransactionRange
    )
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
    dashboardSyncEnabled: getDashboardSyncEnabled({
      connectionsResult,
      providerStatus
    }),
    transactionBackfill: buildTransactionBackfillView({
      connectionsResult,
      completedConnectionIdsResult: completedBackfillConnectionIdsResult,
      providerStatus
    }),
    selectedMonth: {
      value: selectedMonth.value,
      label: selectedMonth.label,
      previousMonth: selectedMonth.previousMonth,
      nextMonth: selectedMonth.nextMonth
    },
    monthlyCashflow: buildMonthlyCashflowSummary({
      transactions: transactionsResult.ok ? transactionsResult.value : [],
      adjustments: monthlyAdjustmentsResult.ok
        ? monthlyAdjustmentsResult.value
        : []
    }),
    monthlyEvolution: {
      summary: buildMonthlyEvolutionSummary({
        transactions: yearlyTransactionsResult.ok
          ? yearlyTransactionsResult.value
          : [],
        adjustments: yearlyAdjustmentsResult.ok
          ? yearlyAdjustmentsResult.value
          : [],
        year: reportYear
      }),
      error: yearlyTransactionsResult.ok
        ? null
        : yearlyTransactionsResult.reason,
      categoryExpenses: buildMonthlyCategoryExpensesSummary({
        transactions: transactionsResult.ok ? transactionsResult.value : [],
        adjustments: monthlyAdjustmentsResult.ok
          ? monthlyAdjustmentsResult.value
          : [],
        periodStart: transactionRange.from
      }),
      categoryExpensesError: transactionsResult.ok
        ? null
        : transactionsResult.reason,
      labelExpenses: buildAnnualLabelExpensesSummary({
        transactions: yearlyTransactionsResult.ok
          ? yearlyTransactionsResult.value
          : [],
        adjustments: yearlyAdjustmentsResult.ok
          ? yearlyAdjustmentsResult.value
          : [],
        year: reportYear
      }),
      labelExpensesError: yearlyTransactionsResult.ok
        ? null
        : yearlyTransactionsResult.reason
    },
    monthlyTransactions: {
      range: transactionRange,
      rows: transactionsResult.ok ? transactionsResult.value : [],
      categoryGroups: categoryGroupsResult.ok ? categoryGroupsResult.value : [],
      labels: labelsResult.ok ? labelsResult.value : [],
      reconciliationEnabled: dataSource.mode === "real",
      error: getMonthlyTransactionsError(
        transactionsResult,
        categoryGroupsResult,
        labelsResult
      )
    }
  };
}

function getMonthlyTransactionsError(
  transactionsResult: Awaited<ReturnType<typeof loadMonthlyTransactions>>,
  categoryGroupsResult: Awaited<
    ReturnType<typeof loadTransactionCategoryGroups>
  >,
  labelsResult: Awaited<ReturnType<typeof loadTransactionLabels>>
): string | null {
  if (!transactionsResult.ok) {
    return transactionsResult.reason;
  }

  if (!categoryGroupsResult.ok) {
    return categoryGroupsResult.reason;
  }

  if (!labelsResult.ok) {
    return labelsResult.reason;
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
