import type * as React from "react";

import type { BankInstitutionCard } from "./bankCard";
import type { ProviderStatusView } from "./providerStatus";

export type PrivateLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export type BankInstitutionCardsProps = {
  cards: BankInstitutionCard[];
};

export type BankConnectionsPanelProps = {
  cards: BankInstitutionCard[];
};

export type MonthlyTransactionsPanelProps = {
  enabled: boolean;
  transactions: import("../dataSource").MonthlyTransactionSummary[];
  range: {
    from: string;
    to: string;
  };
  error: string | null;
};

export type EnableBankingStatusProps = {
  status: ProviderStatusView | { status: "loading" };
};
