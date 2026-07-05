import "server-only";

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

export type BankConnectionSummary = {
  id: string;
  status: string;
  consent_expires_at: string | null;
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
  }>;
};

export type BankingDataSource = {
  mode: "demo" | "real";
  getCurrentUser(): Promise<AppUser | null>;
  getProviderApplication(): Promise<ProviderApplication>;
  listAvailableInstitutions(): Promise<InstitutionAvailability[]>;
  listBankConnections(userId: string): Promise<BankConnectionSummary[]>;
};
