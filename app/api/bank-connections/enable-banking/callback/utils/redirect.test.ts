import { describe, expect, it } from "vitest";

import { redirectWithStatus } from "./redirect";

describe("Enable Banking callback redirect", () => {
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
