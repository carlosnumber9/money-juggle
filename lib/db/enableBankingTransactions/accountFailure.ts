import { getErrorMessage } from "../shared/getErrorMessage";
import type { StoredConnectionForTransactionSync } from "./types";

export function getAccountFailure(
  account: StoredConnectionForTransactionSync["accounts"][number],
  error: unknown
) {
  return {
    account_id: account.id,
    provider_account_id: account.provider_account_id,
    message: getErrorMessage(error)
  };
}
