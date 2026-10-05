import type {
  AccountBalanceSummary,
  MonthlyTransactionSummary,
  TransactionCategoryGroupSummary,
  TransactionReconciliationAdjustment
} from "./dataSource";

export type MonthlyReportAccount = {
  id: string;
  name: string;
  institution: string;
  currency: string;
  status: string;
  connectionId: string;
};

export type MonthlyReportBalance = AccountBalanceSummary & {
  account_id: string;
};

export type MonthlyReportSync = {
  connectionId: string;
  finishedAt: string | null;
  status: string;
};

export type MonthlyReportData = {
  accounts: MonthlyReportAccount[];
  transactions: MonthlyTransactionSummary[];
  adjustments: TransactionReconciliationAdjustment[];
  balances: MonthlyReportBalance[];
  categoryGroups: TransactionCategoryGroupSummary[];
  syncs: MonthlyReportSync[];
  unavailableAdjustmentCount: number;
};
