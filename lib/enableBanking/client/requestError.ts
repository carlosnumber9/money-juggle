import type { EnableBankingErrorResponse } from "@/definitions";

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
