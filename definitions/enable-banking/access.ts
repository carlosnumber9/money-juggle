export type EnableBankingAccess = {
  balances?: boolean;
  transactions?: boolean;
  valid_until: string;
};

export const DEFAULT_CONSENT_SECONDS = 90 * 24 * 60 * 60;
