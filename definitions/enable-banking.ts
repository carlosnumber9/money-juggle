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

export type EnableBankingBalanceResource = {
  name: string;
  balance_amount: {
    currency: string;
    amount: string;
  };
  balance_type: string;
  last_change_date_time?: string;
  reference_date?: string;
  last_committed_transaction?: string;
};

export type EnableBankingBalancesResponse = {
  balances: EnableBankingBalanceResource[];
};

export type EnableBankingTransactionResource = {
  uid?: unknown;
  transaction_id?: unknown;
  internal_transaction_id?: unknown;
  entry_reference?: unknown;
  end_to_end_id?: unknown;
  booking_status?: unknown;
  status?: unknown;
  booking_date?: unknown;
  booking_date_time?: unknown;
  value_date?: unknown;
  value_date_time?: unknown;
  transaction_amount?: {
    currency?: string | number;
    amount?: string | number;
  };
  amount?: {
    currency?: string | number;
    amount?: string | number;
  };
  credit_debit_indicator?: unknown;
  remittance_information?: unknown[];
  remittance_information_unstructured?: unknown;
  description?: unknown;
  merchant_name?: unknown;
  creditor_name?: unknown;
  debtor_name?: unknown;
  counterparty_name?: unknown;
  creditor_account?: {
    iban?: string;
    other?: {
      identification?: string;
    };
  };
  debtor_account?: {
    iban?: string;
    other?: {
      identification?: string;
    };
  };
  bank_transaction_code?: unknown;
  merchant_category_code?: unknown;
};

export type EnableBankingTransactionsResponse =
  | {
      transactions: EnableBankingTransactionResource[];
    }
  | EnableBankingTransactionResource[];

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
  access?: EnableBankingAccess;
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
