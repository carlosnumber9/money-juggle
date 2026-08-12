import { describe, expect, it } from "vitest";

import { shouldReplaceLatestBalance } from "./balancePriority";

describe("shouldReplaceLatestBalance", () => {
  it("prefers the booked cash balance over the available balance from the same fetch", () => {
    const fetchedAt = "2026-08-12T10:00:00.000Z";

    expect(
      shouldReplaceLatestBalance(
        createBalance("CLAV", fetchedAt),
        createBalance("CLBD", fetchedAt)
      )
    ).toBe(true);
    expect(
      shouldReplaceLatestBalance(
        createBalance("CLBD", fetchedAt),
        createBalance("CLAV", fetchedAt)
      )
    ).toBe(false);
  });
});

function createBalance(balanceType: string, fetchedAt: string) {
  return {
    balance_type: balanceType,
    amount: "100.00",
    currency: "EUR",
    reference_date: "2026-08-12",
    fetched_at: fetchedAt
  };
}
