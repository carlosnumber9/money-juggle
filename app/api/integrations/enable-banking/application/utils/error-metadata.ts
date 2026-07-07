import { EnableBankingRequestError } from "@/lib/enable-banking/client";

import {
  getErrorCode,
  isPrivateConfigurationError
} from "./private-config-error";

export function getErrorMetadata(error: unknown) {
  if (error instanceof EnableBankingRequestError) {
    return {
      status: error.status,
      provider_error: error.providerError?.error,
      provider_message: error.providerError?.message
    };
  }

  if (!(error instanceof Error)) {
    return {};
  }

  return {
    name: error.name,
    code: getErrorCode(error),
    kind: isPrivateConfigurationError(error)
      ? "private-configuration"
      : "unexpected",
    message: getSafeErrorMessage(error)
  };
}

function getSafeErrorMessage(error: Error): string {
  if (!isPrivateConfigurationError(error)) {
    return error.message;
  }

  const code = getErrorCode(error);

  if (code === "ENOENT") {
    return "Enable Banking private key path could not be read.";
  }

  if (code === "EACCES") {
    return "Enable Banking private key path is not readable.";
  }

  if (code?.startsWith("ERR_OSSL_")) {
    return "Enable Banking private key could not be parsed or used for signing.";
  }

  return error.message.startsWith("Missing ")
    ? error.message
    : "Enable Banking private configuration is invalid.";
}
