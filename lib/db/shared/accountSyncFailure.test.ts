import { describe, expect, it } from "vitest";

import { EnableBankingRequestError } from "@/lib/enableBanking/client/requestError";

import {
  areAllFailuresRateLimited,
  getAccountSyncFailure
} from "./accountSyncFailure";

describe("account sync failures", () => {
  it("keeps safe structured provider information", () => {
    const failure = getAccountSyncFailure({
      accountId: "account-row",
      providerAccountId: "provider-account",
      error: new EnableBankingRequestError("Try later", 429, {
        error: "ASPSP_RATE_LIMIT_EXCEEDED",
        message: "Bank detail"
      })
    });

    expect(failure).toEqual({
      account_id: "account-row",
      provider_account_id: "provider-account",
      message: "Try later",
      http_status: 429,
      provider_error: "ASPSP_RATE_LIMIT_EXCEEDED",
      rate_limited: true
    });
  });

  it("requires every failure to be rate limited", () => {
    const rateLimited = getAccountSyncFailure({
      accountId: "one",
      providerAccountId: "provider-one",
      error: new EnableBankingRequestError("Try later", 429)
    });
    const unexpected = getAccountSyncFailure({
      accountId: "two",
      providerAccountId: "provider-two",
      error: new Error("Unexpected")
    });

    expect(areAllFailuresRateLimited([rateLimited])).toBe(true);
    expect(areAllFailuresRateLimited([rateLimited, unexpected])).toBe(false);
    expect(areAllFailuresRateLimited([])).toBe(false);
  });
});
