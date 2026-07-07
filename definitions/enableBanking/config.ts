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
