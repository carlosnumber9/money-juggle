import { describe, expect, it } from "vitest";

import { shouldRefreshConnectionTransactions } from "./freshness";

describe("shouldRefreshConnectionTransactions", () => {
  const now = new Date("2026-08-03T12:00:00.000Z");
  const maxAgeMs = 6 * 60 * 60 * 1000;

  it.each([null, "invalid", "2026-08-03T05:59:59.999Z"])(
    "refreshes missing, invalid, or stale value %s",
    (lastTransactionSyncedAt) => {
      expect(
        shouldRefreshConnectionTransactions({
          connection: {
            last_transaction_synced_at: lastTransactionSyncedAt
          },
          maxAgeMs,
          now
        })
      ).toBe(true);
    }
  );

  it("keeps a connection fresh at the exact boundary", () => {
    expect(
      shouldRefreshConnectionTransactions({
        connection: {
          last_transaction_synced_at: "2026-08-03T06:00:00.000Z"
        },
        maxAgeMs,
        now
      })
    ).toBe(false);
  });
});
