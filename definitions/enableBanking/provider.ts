import type { BankConnectionSummary } from "../dataSource";

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
