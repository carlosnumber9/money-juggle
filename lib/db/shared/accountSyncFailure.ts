import { isEnableBankingRateLimitError } from "@/lib/enableBanking/client/providerErrors";
import { EnableBankingRequestError } from "@/lib/enableBanking/client/requestError";

import { getErrorMessage } from "./getErrorMessage";

export type AccountSyncFailure = {
  account_id: string;
  provider_account_id: string;
  message: string;
  http_status?: number;
  provider_error?: string;
  rate_limited: boolean;
};

export function getAccountSyncFailure({
  accountId,
  providerAccountId,
  error
}: {
  accountId: string;
  providerAccountId: string;
  error: unknown;
}): AccountSyncFailure {
  const providerError =
    error instanceof EnableBankingRequestError ? error : undefined;

  return {
    account_id: accountId,
    provider_account_id: providerAccountId,
    message: getErrorMessage(error),
    ...(providerError?.status === undefined
      ? {}
      : { http_status: providerError.status }),
    ...(providerError?.providerError?.error
      ? { provider_error: providerError.providerError.error }
      : {}),
    rate_limited: isEnableBankingRateLimitError(error)
  };
}

export function areAllFailuresRateLimited(
  failures: AccountSyncFailure[]
): boolean {
  return (
    failures.length > 0 && failures.every((failure) => failure.rate_limited)
  );
}
