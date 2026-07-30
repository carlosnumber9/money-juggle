import type * as React from "react";

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

export type PrivateLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export type BankInstitutionCardsProps = {
  cards: BankInstitutionCard[];
};

export type BankConnectionsPanelProps = {
  cards: BankInstitutionCard[];
};

export type DashboardSyncControlsProps = {
  enabled: boolean;
  backfill: TransactionBackfillView;
};

export type MonthlyCashflowCardsProps = {
  summary: MonthlyCashflowSummary;
  selectedMonth: MonthlyPeriodView;
  error: string | null;
};

export type MonthlyTransactionsPanelProps = {
  transactions: import("../dataSource").MonthlyTransactionSummary[];
  categoryGroups: import("../dataSource").TransactionCategoryGroupSummary[];
  labels: import("../dataSource").TransactionLabelSummary[];
  selectedMonth: MonthlyPeriodView;
  error: string | null;
};

export type MonthlyEvolutionPanelProps = {
  evolution: MonthlyEvolutionSummary;
  categoryExpenses: MonthlyCategoryExpensesSummary;
  labelExpenses: AnnualLabelExpensesSummary;
  selectedMonth: MonthlyPeriodView;
  error: string | null;
  categoryExpensesError: string | null;
  labelExpensesError: string | null;
};

export type PrivateHomePageProps = {
  searchParams: Promise<{
    month?: string | string[];
    tab?: string | string[];
  }>;
};

export type EnableBankingStatusProps = {
  status: ProviderStatusView | { status: "loading" };
};
