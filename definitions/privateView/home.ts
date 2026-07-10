import type {
  MonthlyTransactionSummary,
  TransactionCategoryGroupSummary
} from "../dataSource";
import type { BankInstitutionCard } from "./bankCard";
import type { MonthlyCashflowSummary } from "./monthlyCashflow";
import type { MonthlyEvolutionSummary } from "./monthlyEvolution";
import type { ProviderStatusView } from "./providerStatus";

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
      monthlyCashflow: MonthlyCashflowSummary;
      monthlyEvolution: {
        summary: MonthlyEvolutionSummary;
        error: string | null;
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
