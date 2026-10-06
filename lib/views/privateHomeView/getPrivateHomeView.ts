import "server-only";

import type { PrivateHomeView, ProviderStatusView } from "@/definitions";
import { bankingDataSource } from "@/lib/data/bankingDataSource";
import { getDefaultExportMonth } from "@/lib/reports/monthlyExport/period";
import {
  getCurrentYearTransactionRange,
  getSelectedTransactionMonth
} from "@/lib/domain/transactionRanges";

import { getTransactionMonthView } from "../transactionMonthView";

import { buildBankCards } from "./buildBankCards";
import { loadConnections } from "./loadConnections";
import {
  loadCompletedTransactionBackfillConnectionIds,
  loadInstitutions,
  loadMonthlyTransactions,
  loadProviderStatus,
  loadTransactionReconciliationAdjustments
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
  requestedMonth?: string,
  tab: import("@/definitions").HomeTab = "dashboard"
): Promise<PrivateHomeView> {
  const dataSource = bankingDataSource;
  const user = await dataSource.getCurrentUser();
  if (!user) return { kind: "unauthenticated" };
  if (!user.isAllowed) return { kind: "forbidden" };

  const selectedMonth = getSelectedTransactionMonth(requestedMonth);
  const providerPromise =
    loadProviderStatus(dataSource).then(getProviderStatus);
  const common = {
    kind: "ready" as const,
    user: { id: user.id, email: user.email },
    selectedMonth
  };
  if (tab === "transactions") {
    const [monthlyTransactions, providerStatus] = await Promise.all([
      getTransactionMonthView(user.id, requestedMonth, dataSource),
      providerPromise
    ]);
    return { ...common, tab, providerStatus, monthlyTransactions };
  }

  const transactionsPromise = loadMonthlyTransactions(
    dataSource,
    user.id,
    selectedMonth.range
  );
  const adjustmentsPromise = loadTransactionReconciliationAdjustments(
    dataSource,
    user.id,
    selectedMonth.range
  );
  if (tab === "dashboard") {
    const [
      transactions,
      adjustments,
      connectionsResult,
      completedConnectionIdsResult,
      providerStatus
    ] = await Promise.all([
      transactionsPromise,
      adjustmentsPromise,
      loadConnections(dataSource, user.id),
      loadCompletedTransactionBackfillConnectionIds(dataSource, user.id),
      providerPromise
    ]);
    const institutionsResult =
      providerStatus.status === "success"
        ? await loadInstitutions(dataSource)
        : undefined;
    return {
      ...common,
      tab,
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
        completedConnectionIdsResult,
        providerStatus
      }),
      monthlyExportPeriod: {
        defaultMonth: getDefaultExportMonth(),
        currentMonth: getSelectedTransactionMonth().value
      },
      monthlyCashflow: buildMonthlyCashflowSummary({
        transactions: transactions.ok ? transactions.value : [],
        adjustments: adjustments.ok ? adjustments.value : []
      }),
      monthlyCashflowError: transactions.ok
        ? adjustments.ok
          ? null
          : adjustments.reason
        : transactions.reason
    };
  }

  const yearlyRange = getCurrentYearTransactionRange();
  const year = Number(yearlyRange.from.slice(0, 4));
  const [
    transactions,
    adjustments,
    yearlyTransactions,
    yearlyAdjustments,
    providerStatus
  ] = await Promise.all([
    transactionsPromise,
    adjustmentsPromise,
    loadMonthlyTransactions(dataSource, user.id, yearlyRange),
    loadTransactionReconciliationAdjustments(dataSource, user.id, yearlyRange),
    providerPromise
  ]);
  return {
    ...common,
    tab,
    providerStatus,
    monthlyEvolution: {
      summary: buildMonthlyEvolutionSummary({
        transactions: yearlyTransactions.ok ? yearlyTransactions.value : [],
        adjustments: yearlyAdjustments.ok ? yearlyAdjustments.value : [],
        year
      }),
      error: yearlyTransactions.ok
        ? yearlyAdjustments.ok
          ? null
          : yearlyAdjustments.reason
        : yearlyTransactions.reason,
      categoryExpenses: buildMonthlyCategoryExpensesSummary({
        transactions: transactions.ok ? transactions.value : [],
        adjustments: adjustments.ok ? adjustments.value : [],
        periodStart: selectedMonth.range.from
      }),
      categoryExpensesError: transactions.ok
        ? adjustments.ok
          ? null
          : adjustments.reason
        : transactions.reason,
      labelExpenses: buildAnnualLabelExpensesSummary({
        transactions: yearlyTransactions.ok ? yearlyTransactions.value : [],
        adjustments: yearlyAdjustments.ok ? yearlyAdjustments.value : [],
        year
      }),
      labelExpensesError: yearlyTransactions.ok
        ? yearlyAdjustments.ok
          ? null
          : yearlyAdjustments.reason
        : yearlyTransactions.reason
    }
  };
}

function getProviderStatus(
  result: Awaited<ReturnType<typeof loadProviderStatus>>
): ProviderStatusView {
  return result.ok ? result.value : { status: "error", reason: result.reason };
}
