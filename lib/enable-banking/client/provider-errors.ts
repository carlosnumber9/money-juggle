import { stringifyErrorDetail } from "./error-detail";
import { EnableBankingRequestError } from "./request-error";

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
