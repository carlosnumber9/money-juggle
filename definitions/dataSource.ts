export type AppUser = {
  id: string;
  email: string | null;
  isAllowed: boolean;
};

export type ProviderApplication = {
  name: string;
  kid: string;
  environment: string;
  active: boolean;
  countries: string[];
  services: string[];
};

export type InstitutionAvailability = {
  name: string;
  country: string;
  logo?: string;
  beta?: boolean;
  maximumConsentValidity?: number;
};

export type AccountBalanceSummary = {
  balance_type: string;
  amount: string;
  currency: string;
  reference_date: string | null;
  fetched_at: string;
};

export type BankConnectionSummary = {
  id: string;
  status: string;
  consent_expires_at: string | null;
  created_at: string;
  updated_at: string;
  institution: {
    name: string;
    country: string | null;
    logo_url: string | null;
  } | null;
  accounts: Array<{
    id: string;
    name: string;
    currency: string;
    iban_last4: string | null;
    account_type: string | null;
    status: string;
    latest_balance: AccountBalanceSummary | null;
  }>;
};

export type MonthlyTransactionSummary = {
  id: string;
  institution_slug: "caixabank" | "ing" | "unknown";
  institution_name: string;
  institution_provider_id: string | null;
  account_id: string;
  account_name: string;
  account_iban_last4: string | null;
  booking_status: "booked" | "pending" | "information";
  booking_date: string | null;
  cashflow_type: "external" | "internal_transfer";
  amount: string;
  currency: string;
  description: string | null;
  merchant_name: string | null;
  counterparty_name: string | null;
  category: MonthlyTransactionCategory | null;
  labels: TransactionLabelSummary[];
};

export type TransactionLabelSummary = {
  id: string;
  name: string;
};

export type MonthlyTransactionCategory = {
  id: string;
  name: string;
  slug: string;
  group: {
    id: string;
    name: string;
  };
};

export type TransactionCategorySummary = {
  id: string;
  name: string;
  slug: string;
};

export type TransactionCategoryGroupSummary = {
  id: string;
  name: string;
  slug: string;
  categories: TransactionCategorySummary[];
};

export type MonthlyTransactionRange = {
  from: string;
  to: string;
};

export type BankingDataSource = {
  mode: "demo" | "real";
  getCurrentUser(): Promise<AppUser | null>;
  getProviderApplication(): Promise<ProviderApplication>;
  listAvailableInstitutions(): Promise<InstitutionAvailability[]>;
  listBankConnections(userId: string): Promise<BankConnectionSummary[]>;
  listCompletedTransactionBackfillConnectionIds(
    userId: string
  ): Promise<string[]>;
  listMonthlyTransactions(
    userId: string,
    range: MonthlyTransactionRange
  ): Promise<MonthlyTransactionSummary[]>;
  listTransactionCategoryGroups(
    userId: string
  ): Promise<TransactionCategoryGroupSummary[]>;
  listTransactionLabels(userId: string): Promise<TransactionLabelSummary[]>;
};

export const INITIAL_BANK_NAMES = ["CaixaBank", "ING"] as const;
