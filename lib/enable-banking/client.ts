import "server-only";

import { getEnableBankingConfig } from "@/lib/enable-banking/env";
import { createEnableBankingJwt } from "@/lib/enable-banking/jwt";

export type EnableBankingApplication = {
  name: string;
  description?: string;
  kid: string;
  environment: string;
  redirect_urls: string[];
  active: boolean;
  countries: string[];
  services: string[];
};

export class EnableBankingRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "EnableBankingRequestError";
  }
}

export async function getEnableBankingApplication(): Promise<EnableBankingApplication> {
  return requestEnableBanking<EnableBankingApplication>("/application");
}

async function requestEnableBanking<T>(path: string): Promise<T> {
  const config = getEnableBankingConfig();
  const jwt = createEnableBankingJwt({
    applicationId: config.applicationId,
    privateKey: config.privateKey
  });

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${jwt}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new EnableBankingRequestError(
      getSafeErrorMessage(response.status),
      response.status
    );
  }

  return (await response.json()) as T;
}

function getSafeErrorMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "Enable Banking rejected the signed request. Check the application id and private key.";
  }

  if (status === 404) {
    return "Enable Banking did not find the application for the provided key id.";
  }

  if (status === 408 || status === 429 || status >= 500) {
    return "Enable Banking is temporarily unavailable or rate limited the request.";
  }

  return "Enable Banking returned an unexpected response.";
}
