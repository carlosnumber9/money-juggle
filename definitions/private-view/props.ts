import type * as React from "react";

import type { BankInstitutionCard } from "./bank-card";
import type { ProviderStatusView } from "./provider-status";

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
  transactions: import("../data-source").MonthlyTransactionSummary[];
  range: {
    from: string;
    to: string;
  };
  error: string | null;
};

export type EnableBankingStatusProps = {
  status: ProviderStatusView | { status: "loading" };
};
