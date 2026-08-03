export type EnableBankingConfig = {
  apiBaseUrl: string;
  applicationId: string;
  privateKey: string;
};

export type EnableBankingPsuHeaderName =
  | "Psu-Ip-Address"
  | "Psu-User-Agent"
  | "Psu-Referer"
  | "Psu-Accept"
  | "Psu-Accept-Charset"
  | "Psu-Accept-Encoding"
  | "Psu-Accept-Language";

export type EnableBankingPsuHeaders = Partial<
  Record<EnableBankingPsuHeaderName, string>
>;

export const DEFAULT_ENABLE_BANKING_API_BASE_URL =
  "https://api.enablebanking.com";

export type EnableBankingJwtInput = {
  applicationId: string;
  privateKey: string;
};

export const ENABLE_BANKING_ISSUER = "enablebanking.com";
export const ENABLE_BANKING_AUDIENCE = "api.enablebanking.com";
export const ENABLE_BANKING_TOKEN_TTL_SECONDS = 60 * 60;
