import type {
  MonthlyTransactionSummary,
  TransactionCategoryGroupSummary
} from "../dataSource";
import type { BankInstitutionCard } from "./bankCard";
import type { MonthlyCashflowSummary } from "./monthlyCashflow";
import type {
  MonthlyCategoryExpensesSummary,
  MonthlyEvolutionSummary
} from "./monthlyEvolution";
import type { MonthlyPeriodView } from "./monthlyPeriod";
import type { ProviderStatusView } from "./providerStatus";
import type { TransactionBackfillView } from "./transactionBackfill";

export type PrivateHomeView =
  | {
      kind: "unauthenticated";
    }
  | {
      kind: "forbidden";
    }
  | {
      kind: "ready";
      user: {
        email: string | null;
      };
      providerStatus: ProviderStatusView;
      bankCards: BankInstitutionCard[];
      dashboardSyncEnabled: boolean;
      transactionBackfill: TransactionBackfillView;
      selectedMonth: MonthlyPeriodView;
      monthlyCashflow: MonthlyCashflowSummary;
      monthlyEvolution: {
        summary: MonthlyEvolutionSummary;
        error: string | null;
        categoryExpenses: MonthlyCategoryExpensesSummary;
        categoryExpensesError: string | null;
      };
      monthlyTransactions: {
        range: {
          from: string;
          to: string;
        };
        rows: MonthlyTransactionSummary[];
        categoryGroups: TransactionCategoryGroupSummary[];
        error: string | null;
      };
    };
