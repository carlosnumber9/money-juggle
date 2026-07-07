import type { MonthlyTransactionSummary } from "../data-source";
import type { BankInstitutionCard } from "./bank-card";
import type { ProviderStatusView } from "./provider-status";

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
