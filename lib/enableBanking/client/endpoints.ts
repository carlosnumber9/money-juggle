import "server-only";

import type {
  EnableBankingApplication,
  EnableBankingAspsp,
  EnableBankingAuthorizeSessionResponse,
  EnableBankingBalancesResponse,
  EnableBankingBalanceResource,
  EnableBankingStartAuthorizationInput,
  EnableBankingStartAuthorizationResponse,
  EnableBankingTransactionResource,
  EnableBankingTransactionsResponse
} from "@/definitions";

import { requestEnableBanking } from "./request";

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

export async function getEnableBankingAccountBalances(
  accountId: string
): Promise<EnableBankingBalanceResource[]> {
  const response = await requestEnableBanking<EnableBankingBalancesResponse>(
    `/accounts/${encodeURIComponent(accountId)}/balances`
  );

  return response.balances;
}

export async function getEnableBankingAccountTransactions(input: {
  accountId: string;
  dateFrom: string;
  dateTo: string;
}): Promise<EnableBankingTransactionResource[]> {
  const searchParams = new URLSearchParams({
    date_from: input.dateFrom,
    date_to: input.dateTo
  });
  const response =
    await requestEnableBanking<EnableBankingTransactionsResponse>(
      `/accounts/${encodeURIComponent(input.accountId)}/transactions?${searchParams}`
    );

  return Array.isArray(response) ? response : response.transactions;
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
