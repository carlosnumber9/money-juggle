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

export type BankingDataSource = {
  mode: "demo" | "real";
  getCurrentUser(): Promise<AppUser | null>;
  getProviderApplication(): Promise<ProviderApplication>;
  listAvailableInstitutions(): Promise<InstitutionAvailability[]>;
  listBankConnections(userId: string): Promise<BankConnectionSummary[]>;
};

export const INITIAL_BANK_NAMES = ["CaixaBank", "ING"] as const;
