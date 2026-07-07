import {
  EnableBankingRequestError,
  getEnableBankingErrorMetadata,
  getEnableBankingErrorStatus
} from "@/lib/enableBanking/client";

export function getPublicErrorStatus(error: unknown): string {
  if (error instanceof EnableBankingRequestError) {
    return getEnableBankingErrorStatus(error);
  }

  if (error instanceof Error && error.message.startsWith("Missing ")) {
    return "server-config-error";
  }

  return "callback-error";
}

export function getPublicErrorMetadata(error: unknown) {
  if (error instanceof EnableBankingRequestError) {
    return getEnableBankingErrorMetadata(error);
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return {};
}
