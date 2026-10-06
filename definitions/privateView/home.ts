import type {
  MonthlyTransactionSummary,
  TransactionCategoryGroupSummary,
  TransactionLabelSummary
} from "../dataSource";
import type { BankInstitutionCard } from "./bankCard";
import type { MonthlyCashflowSummary } from "./monthlyCashflow";
import type {
  AnnualLabelExpensesSummary,
  MonthlyCategoryExpensesSummary,
  MonthlyEvolutionSummary
} from "./monthlyEvolution";
import type { MonthlyPeriodView } from "./monthlyPeriod";
import type { ProviderStatusView } from "./providerStatus";
import type { TransactionBackfillView } from "./transactionBackfill";

export type HomeTab = "dashboard" | "transactions" | "evolution";

export type MonthlyTransactionsView = {
  range: { from: string; to: string };
  rows: MonthlyTransactionSummary[];
  categoryGroups: TransactionCategoryGroupSummary[];
  labels: TransactionLabelSummary[];
  error: string | null;
};

export type MonthlyEvolutionView = {
  summary: MonthlyEvolutionSummary;
  error: string | null;
  categoryExpenses: MonthlyCategoryExpensesSummary;
  categoryExpensesError: string | null;
  labelExpenses: AnnualLabelExpensesSummary;
  labelExpensesError: string | null;
};

type ReadyHomeView = {
  kind: "ready";
  user: { id: string; email: string | null };
  providerStatus: ProviderStatusView;
  selectedMonth: MonthlyPeriodView;
};

export type PrivateHomeView =
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | (ReadyHomeView & {
      tab: "transactions";
      monthlyTransactions: MonthlyTransactionsView;
    })
  | (ReadyHomeView & {
      tab: "dashboard";
      bankCards: BankInstitutionCard[];
      dashboardSyncEnabled: boolean;
      monthlyExportPeriod: { defaultMonth: string; currentMonth: string };
      transactionBackfill: TransactionBackfillView;
      monthlyCashflow: MonthlyCashflowSummary;
      monthlyCashflowError: string | null;
    })
  | (ReadyHomeView & {
      tab: "evolution";
      monthlyEvolution: MonthlyEvolutionView;
    });
