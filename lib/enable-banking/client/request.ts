import "server-only";

import { getEnableBankingConfig } from "@/lib/enable-banking/env";
import { createEnableBankingJwt } from "@/lib/enable-banking/jwt";

import { getSafeErrorMessage } from "./error-message";
import { readEnableBankingError } from "./error-response";
import { EnableBankingRequestError } from "./request-error";

export async function requestEnableBanking<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
  } = {}
): Promise<T> {
  const config = getEnableBankingConfig();
  const jwt = createEnableBankingJwt({
    applicationId: config.applicationId,
    privateKey: config.privateKey
  });
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${jwt}`,
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store"
  });

  if (!response.ok) {
    const providerError = await readEnableBankingError(response);

    throw new EnableBankingRequestError(
      getSafeErrorMessage(response.status, providerError),
      response.status,
      providerError
    );
  }

  return (await response.json()) as T;
}
