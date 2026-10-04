import { describe, expect, it } from "vitest";

import { redirectWithStatus } from "./redirect";

describe("Enable Banking callback redirect", () => {
  it("includes the internal connection ID for authenticated account review", () => {
    const response = redirectWithStatus(
      new URL("https://example.com/callback"),
      "account-match-required",
      "connection-id"
    );
    expect(response.headers.get("location")).toBe(
      "https://example.com/bank-connection-result?status=account-match-required&connection=connection-id"
    );
  });
  it("sends callback results to the public completion page", () => {
    const response = redirectWithStatus(
      new URL(
        "https://money-juggle.vercel.app/api/bank-connections/enable-banking/callback"
      ),
      "linked"
    );

    expect(response.headers.get("location")).toBe(
      "https://money-juggle.vercel.app/bank-connection-result?status=linked"
    );
  });
});
