import type { MonthlyTransactionSummary } from "../dataSource";
import type { BankInstitutionCard } from "./bankCard";
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
      monthlyTransactions: {
        range: {
          from: string;
          to: string;
        };
        rows: MonthlyTransactionSummary[];
        error: string | null;
      };
    };
