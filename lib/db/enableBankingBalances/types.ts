export type StoredAccountForBalanceSync = {
  id: string;
  provider_account_id: string;
  currency: string;
};

export type StoredConnectionForBalanceSync = {
  id: string;
  user_id: string;
  status: string;
  provider_session_id: string | null;
  provider_rate_limited_until: string | null;
  accounts: StoredAccountForBalanceSync[];
};

export type { AccountSyncFailure as BalanceSyncFailure } from "../shared/accountSyncFailure";
