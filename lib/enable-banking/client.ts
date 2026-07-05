import "server-only";

import type {
  EnableBankingApplication,
  EnableBankingAspsp,
  EnableBankingAuthorizeSessionResponse,
  EnableBankingBalancesResponse,
  EnableBankingBalanceResource,
  EnableBankingErrorResponse,
  EnableBankingStartAuthorizationInput,
  EnableBankingStartAuthorizationResponse
} from "@/definitions";
import { getEnableBankingConfig } from "@/lib/enable-banking/env";
import { createEnableBankingJwt } from "@/lib/enable-banking/jwt";

export class EnableBankingRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly providerError?: EnableBankingErrorResponse
  ) {
    super(message);
    this.name = "EnableBankingRequestError";
  }
}

export async function getEnableBankingApplication(): Promise<EnableBankingApplication> {
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

  if (country) {
    searchParams.set("country", country);
  }

  if (psuType) {
    searchParams.set("psu_type", psuType);
  }

  if (service) {
    searchParams.set("service", service);
  }

  const query = searchParams.toString();
  const response = await requestEnableBanking<
    EnableBankingAspsp[] | { aspsps: EnableBankingAspsp[] }
  >(`/aspsps${query ? `?${query}` : ""}`);

  return Array.isArray(response) ? response : response.aspsps;
}

export async function startEnableBankingAuthorization(
  input: EnableBankingStartAuthorizationInput
): Promise<EnableBankingStartAuthorizationResponse> {
  return requestEnableBanking<EnableBankingStartAuthorizationResponse>(
    "/auth",
    {
      method: "POST",
      body: input
    }
  );
}

export async function authorizeEnableBankingSession(
  code: string
): Promise<EnableBankingAuthorizeSessionResponse> {
  return requestEnableBanking<EnableBankingAuthorizeSessionResponse>(
    "/sessions",
    {
      method: "POST",
      body: { code }
    }
  );
}

export async function getEnableBankingAccountBalances(
  accountId: string
): Promise<EnableBankingBalanceResource[]> {
  const response = await requestEnableBanking<EnableBankingBalancesResponse>(
    `/accounts/${encodeURIComponent(accountId)}/balances`
  );

  return response.balances;
}

async function requestEnableBanking<T>(
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

export function getEnableBankingErrorStatus(error: unknown): string {
  if (!(error instanceof EnableBankingRequestError)) {
    return "provider-error";
  }

  switch (error.providerError?.error) {
    case "REDIRECT_URI_NOT_ALLOWED":
      return "redirect-uri-not-allowed";
    case "NO_ACCOUNTS_ADDED":
      return "no-accounts-added";
    case "WRONG_ASPSP_PROVIDED":
      return "wrong-aspsp";
    case "ACCESS_DENIED":
      return "provider-access-denied";
    case "WRONG_REQUEST_PARAMETERS":
      return "wrong-request-parameters";
    case "WRONG_AUTHORIZATION_CODE":
    case "EXPIRED_AUTHORIZATION_CODE":
      return "authorization-code-error";
    case "PSU_HEADER_INVALID":
    case "PSU_HEADER_NOT_PROVIDED":
      return "psu-header-error";
    case "ASPSP_ERROR":
      return "aspsp-error";
    case "ASPSP_RATE_LIMIT_EXCEEDED":
      return "aspsp-rate-limited";
    case "ASPSP_TIMEOUT":
      return "aspsp-timeout";
    case "AUTHORIZATION_NOT_PROVIDED":
    case "UNAUTHORIZED_ACCESS":
    case "UNAUTHORIZED_IP":
      return "provider-authentication-error";
    default:
      return "provider-error";
  }
}

export function getEnableBankingErrorMetadata(error: unknown) {
  if (!(error instanceof EnableBankingRequestError)) {
    return {};
  }

  return {
    status: error.status,
    provider_error: error.providerError?.error,
    provider_message: error.providerError?.message,
    provider_detail: stringifyErrorDetail(error.providerError?.detail)
  };
}

async function readEnableBankingError(
  response: Response
): Promise<EnableBankingErrorResponse | undefined> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = (await response.json().catch(() => undefined)) as unknown;

    return normalizeEnableBankingError(data);
  }

  const text = await response.text().catch(() => "");

  if (!text) {
    return undefined;
  }

  return {
    message: text.slice(0, 500),
    code: response.status
  };
}

function normalizeEnableBankingError(
  value: unknown
): EnableBankingErrorResponse | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const message = typeof record.message === "string" ? record.message : "";

  if (!message) {
    return undefined;
  }

  return {
    message,
    code: typeof record.code === "number" ? record.code : undefined,
    error: typeof record.error === "string" ? record.error : undefined,
    detail: record.detail
  };
}

function getSafeErrorMessage(
  status: number,
  providerError: EnableBankingErrorResponse | undefined
): string {
  switch (providerError?.error) {
    case "REDIRECT_URI_NOT_ALLOWED":
      return "La URL de retorno no está autorizada en Enable Banking.";
    case "NO_ACCOUNTS_ADDED":
      return "No hay cuentas permitidas para esta aplicación de Enable Banking.";
    case "WRONG_ASPSP_PROVIDED":
      return "Enable Banking no aceptó el banco seleccionado.";
    case "ACCESS_DENIED":
      return "La aplicación no tiene acceso al servicio solicitado en Enable Banking.";
    case "WRONG_REQUEST_PARAMETERS":
      return "Enable Banking no aceptó los parámetros de la solicitud.";
    case "WRONG_AUTHORIZATION_CODE":
    case "EXPIRED_AUTHORIZATION_CODE":
      return "El código de autorización de Enable Banking no es válido o ha caducado.";
    case "PSU_HEADER_INVALID":
    case "PSU_HEADER_NOT_PROVIDED":
      return "Enable Banking requiere datos adicionales del navegador para esta operación.";
    case "ASPSP_ERROR":
      return "El banco devolvió un error durante la autorización.";
    case "ASPSP_RATE_LIMIT_EXCEEDED":
      return "El banco ha limitado temporalmente las solicitudes.";
    case "ASPSP_TIMEOUT":
      return "El banco tardó demasiado en responder.";
  }

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

function stringifyErrorDetail(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return value.slice(0, 500);
  }

  try {
    return JSON.stringify(value).slice(0, 500);
  } catch {
    return String(value).slice(0, 500);
  }
}
