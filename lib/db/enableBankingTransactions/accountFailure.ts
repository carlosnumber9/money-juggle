import { getAccountSyncFailure } from "../shared/accountSyncFailure";
import type { StoredConnectionForTransactionSync } from "./types";

export function getAccountFailure(
  account: StoredConnectionForTransactionSync["accounts"][number],
  error: unknown
) {
  return getAccountSyncFailure({
    accountId: account.id,
    providerAccountId: account.provider_account_id,
    error
  });
}
