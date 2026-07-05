import type { BankConnectionSummary } from "./data-source";

export const ENABLE_BANKING_PROVIDER = "enable_banking";

export type StoredBankConnection = {
  id: string;
  user_id: string;
  institution_id: string;
  status: string;
  provider_state: string | null;
};

export type UserBankConnectionSummary = BankConnectionSummary;

export type ConsentEventType = "created" | "redirected" | "linked" | "failed";

export type EnableBankingConfig = {
  apiBaseUrl: string;
  applicationId: string;
  privateKey: string;
};

export const DEFAULT_ENABLE_BANKING_API_BASE_URL =
  "https://api.enablebanking.com";

export type EnableBankingJwtInput = {
  applicationId: string;
  privateKey: string;
};

export const ENABLE_BANKING_ISSUER = "enablebanking.com";
export const ENABLE_BANKING_AUDIENCE = "api.enablebanking.com";
export const ENABLE_BANKING_TOKEN_TTL_SECONDS = 60 * 60;

export type EnableBankingApplication = {
  name: string;
  description?: string;
  kid: string;
  environment: string;
  redirect_urls: string[];
  active: boolean;
  countries: string[];
  services: string[];
};

export type EnableBankingAspsp = {
  name: string;
  country: string;
  logo: string;
  psu_types: string[];
  maximum_consent_validity: number;
  beta: boolean;
  bic?: string;
  auth_methods: Array<{
    name: string;
    psu_type: string;
    approach: string;
    hidden_method: boolean;
  }>;
  group?: {
    name: string;
    logo: string;
  };
};

export type EnableBankingAccess = {
  balances?: boolean;
  transactions?: boolean;
  valid_until: string;
};

export type EnableBankingAccountResource = {
  uid: string;
  account_id?: {
    iban?: string;
    other?: {
      identification?: string;
      scheme_name?: string;
    };
  };
  all_account_ids?: Array<{
    identification?: string;
    scheme_name?: string;
  }>;
  name?: string;
  details?: string;
  cash_account_type?: string;
  product?: string;
  currency?: string;
  psu_status?: string;
  identification_hash?: string;
  identification_hashes?: string[];
};

export type EnableBankingStartAuthorizationInput = {
  access: EnableBankingAccess;
  aspsp: {
    name: string;
    country: string;
  };
  state: string;
  redirect_url: string;
  psu_type: "personal" | "business";
  language?: string;
  psu_id: string;
};

export type EnableBankingStartAuthorizationResponse = {
  url: string;
  authorization_id: string;
  psu_id_hash: string;
  access: EnableBankingAccess;
};

export type EnableBankingAuthorizeSessionResponse = {
  session_id: string;
  accounts: EnableBankingAccountResource[];
  aspsp: {
    name: string;
    country: string;
  };
  psu_type: string;
  access: EnableBankingAccess;
};

export type EnableBankingErrorResponse = {
  message: string;
  code?: number;
  error?: string;
  detail?: unknown;
};

export const DEFAULT_CONSENT_SECONDS = 90 * 24 * 60 * 60;
