import "server-only";

import type {
  EnableBankingApplication,
  EnableBankingAspsp,
  EnableBankingAuthorizeSessionResponse,
  EnableBankingSessionResponse,
  EnableBankingBalancesResponse,
  EnableBankingBalanceResource,
  EnableBankingStartAuthorizationInput,
  EnableBankingStartAuthorizationResponse,
  EnableBankingTransactionsFetchStrategy,
  EnableBankingTransactionsResult,
  EnableBankingTransactionResource,
  EnableBankingTransactionsResponse,
  EnableBankingPsuHeaders
} from "@/definitions";

import { requestEnableBanking } from "./request";
import { appendTransactionPage } from "./transactionPages";

export const MAX_TRANSACTION_PAGE_REQUESTS = 100;
export const MAX_REPEATED_CONTINUATION_RETRIES = 2;

export async function getEnableBankingApplication() {
  return requestEnableBanking<EnableBankingApplication>("/application");
}

export async function getEnableBankingAspsps({
  country,
  psuType,
  service
}: {
  country?: string;
  psuType?: "personal" | "business";
  service?: "AIS";
} = {}): Promise<EnableBankingAspsp[]> {
  const searchParams = new URLSearchParams();
  setSearchParam(searchParams, "country", country);
  setSearchParam(searchParams, "psu_type", psuType);
  setSearchParam(searchParams, "service", service);

  const query = searchParams.toString();
  const response = await requestEnableBanking<
    EnableBankingAspsp[] | { aspsps: EnableBankingAspsp[] }
  >(`/aspsps${query ? `?${query}` : ""}`);

  return Array.isArray(response) ? response : response.aspsps;
}

export async function startEnableBankingAuthorization(
  input: EnableBankingStartAuthorizationInput
): Promise<EnableBankingStartAuthorizationResponse> {
  return requestEnableBanking("/auth", { method: "POST", body: input });
}

export async function authorizeEnableBankingSession(
  code: string
): Promise<EnableBankingAuthorizeSessionResponse> {
  return requestEnableBanking("/sessions", { method: "POST", body: { code } });
}

export async function getEnableBankingSession(sessionId: string) {
  return requestEnableBanking<EnableBankingSessionResponse>(
    `/sessions/${encodeURIComponent(sessionId)}`
  );
}

export async function getEnableBankingAccountBalances(
  accountId: string,
  psuHeaders?: EnableBankingPsuHeaders
): Promise<EnableBankingBalanceResource[]> {
  const response = await requestEnableBanking<EnableBankingBalancesResponse>(
    `/accounts/${encodeURIComponent(accountId)}/balances`,
    { psuHeaders }
  );

  return response.balances;
}

export async function getEnableBankingAccountTransactions(input: {
  accountId: string;
  dateFrom: string;
  dateTo: string;
  strategy: EnableBankingTransactionsFetchStrategy;
  psuHeaders?: EnableBankingPsuHeaders;
}): Promise<EnableBankingTransactionsResult> {
  const baseSearchParams = new URLSearchParams({
    date_from: input.dateFrom,
    date_to: input.dateTo,
    strategy: input.strategy
  });
  const transactions: EnableBankingTransactionResource[] = [];
  const seenContinuationKeys = new Set<string>();
  let continuationKey: string | null = null;
  let paginationTruncated = false;
  let paginationTruncationReason:
    "repeated-continuation-key" | "page-limit" | undefined;
  let repeatedKeyCount = 0;
  let requestCount = 0;
  const transactionIndices = new Map<string, number>();

  do {
    const searchParams = new URLSearchParams(baseSearchParams);

    if (continuationKey) {
      searchParams.set("continuation_key", continuationKey);
    }

    let response: EnableBankingTransactionsResponse;
    try {
      response = await requestEnableBanking<EnableBankingTransactionsResponse>(
        `/accounts/${encodeURIComponent(input.accountId)}/transactions?${searchParams}`,
        { psuHeaders: input.psuHeaders }
      );
    } catch (error) {
      if (requestCount === 0) throw error;
      return {
        transactions,
        paginationTruncated: true,
        paginationTruncationReason: "request-failed",
        pageError: error
      };
    }

    const nextContinuationKey = getContinuationKey(response);
    requestCount += 1;
    appendTransactionPage(
      transactions,
      transactionIndices,
      Array.isArray(response) ? response : response.transactions
    );

    if (nextContinuationKey && seenContinuationKeys.has(nextContinuationKey)) {
      repeatedKeyCount += 1;
      if (repeatedKeyCount > MAX_REPEATED_CONTINUATION_RETRIES) {
        paginationTruncated = true;
        paginationTruncationReason = "repeated-continuation-key";
        break;
      }
    }

    continuationKey = nextContinuationKey;

    if (continuationKey && requestCount >= MAX_TRANSACTION_PAGE_REQUESTS) {
      paginationTruncated = true;
      paginationTruncationReason = "page-limit";
      break;
    }

    if (continuationKey) {
      seenContinuationKeys.add(continuationKey);
    }
  } while (continuationKey);

  return {
    transactions,
    paginationTruncated,
    ...(paginationTruncationReason ? { paginationTruncationReason } : {})
  };
}

function getContinuationKey(
  response: EnableBankingTransactionsResponse
): string | null {
  if (Array.isArray(response)) {
    return null;
  }

  return typeof response.continuation_key === "string" &&
    response.continuation_key.length > 0
    ? response.continuation_key
    : null;
}

function setSearchParam(
  searchParams: URLSearchParams,
  key: string,
  value: string | undefined
) {
  if (value) {
    searchParams.set(key, value);
  }
}
