import { describe, expect, it } from "vitest";

import {
  getEnableBankingErrorMetadata,
  getEnableBankingErrorStatus,
  isEnableBankingRateLimitError
} from "./providerErrors";
import { EnableBankingRequestError } from "./requestError";

describe("Enable Banking provider errors", () => {
  it("classifies an ASPSP rate limit", () => {
    const error = new EnableBankingRequestError("Rate limited", 429, {
      error: "ASPSP_RATE_LIMIT_EXCEEDED",
      message: "Provider limit",
      detail: { retry: "later" }
    });

    expect(getEnableBankingErrorStatus(error)).toBe("aspsp-rate-limited");
    expect(isEnableBankingRateLimitError(error)).toBe(true);
    expect(getEnableBankingErrorMetadata(error)).toEqual({
      status: 429,
      provider_error: "ASPSP_RATE_LIMIT_EXCEEDED",
      provider_message: "Provider limit",
      provider_detail: '{"retry":"later"}'
    });
  });

  it("also treats a generic HTTP 429 as a rate limit", () => {
    expect(
      isEnableBankingRateLimitError(
        new EnableBankingRequestError("Rate limited", 429)
      )
    ).toBe(true);
  });

  it("does not classify unrelated errors as rate limits", () => {
    expect(isEnableBankingRateLimitError(new Error("Network failed"))).toBe(
      false
    );
  });
});
