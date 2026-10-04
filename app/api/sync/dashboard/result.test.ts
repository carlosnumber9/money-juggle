import { describe, expect, it } from "vitest";

import { getDashboardSyncResult } from "./result";

const succeededBalances = {
  synced: true,
  succeededConnectionCount: 1,
  failedConnectionCount: 0,
  rateLimitedConnectionCount: 0,
  cooldownConnectionCount: 0,
  cooldownUntil: null
};

const succeededTransactions = {
  synced: true,
  succeededAccountCount: 2,
  partialAccountCount: 0,
  failedAccountCount: 0,
  rateLimitedAccountCount: 0,
  cooldownConnectionCount: 0,
  cooldownUntil: null
};

describe("getDashboardSyncResult", () => {
  it("reports truncation even when every balance was fetched successfully", () => {
    expect(
      getDashboardSyncResult({
        balances: succeededBalances,
        transactions: {
          ...succeededTransactions,
          succeededAccountCount: 0,
          partialAccountCount: 1
        }
      })
    ).toMatchObject({ status: 200, body: { partialFailure: true } });
  });
  it("keeps an empty truncated account visible as incomplete", () => {
    expect(
      getDashboardSyncResult({
        balances: {
          ...succeededBalances,
          synced: false,
          succeededConnectionCount: 0
        },
        transactions: {
          ...succeededTransactions,
          synced: false,
          succeededAccountCount: 0,
          partialAccountCount: 1
        }
      })
    ).toMatchObject({
      status: 200,
      body: { synced: false, partialFailure: true }
    });
  });
  it("returns a failure when every attempted resource failed", () => {
    expect(
      getDashboardSyncResult({
        balances: {
          ...succeededBalances,
          synced: false,
          succeededConnectionCount: 0,
          failedConnectionCount: 1
        },
        transactions: {
          ...succeededTransactions,
          synced: false,
          succeededAccountCount: 0,
          failedAccountCount: 2
        }
      })
    ).toMatchObject({ status: 500, body: { partialFailure: true } });
  });
  it("combines successful balance and transaction work", () => {
    expect(
      getDashboardSyncResult({
        balances: succeededBalances,
        transactions: succeededTransactions
      })
    ).toEqual({
      status: 200,
      body: {
        synced: true,
        partialFailure: false,
        rateLimited: false,
        cooldownUntil: null
      }
    });
  });

  it("returns 429 after a new provider rate limit", () => {
    expect(
      getDashboardSyncResult({
        balances: {
          ...succeededBalances,
          synced: false,
          succeededConnectionCount: 0,
          failedConnectionCount: 1,
          rateLimitedConnectionCount: 1,
          cooldownUntil: "2026-08-03T18:00:00.000Z"
        },
        transactions: {
          ...succeededTransactions,
          synced: false,
          succeededAccountCount: 0,
          cooldownConnectionCount: 1,
          cooldownUntil: "2026-08-03T18:00:00.000Z"
        }
      })
    ).toMatchObject({
      status: 429,
      body: {
        rateLimited: true,
        cooldownUntil: "2026-08-03T18:00:00.000Z"
      }
    });
  });

  it("reports an existing cooldown without treating it as a new failure", () => {
    expect(
      getDashboardSyncResult({
        balances: {
          ...succeededBalances,
          synced: false,
          succeededConnectionCount: 0,
          cooldownConnectionCount: 1,
          cooldownUntil: "2026-08-03T18:00:00.000Z"
        },
        transactions: {
          ...succeededTransactions,
          synced: false,
          succeededAccountCount: 0,
          cooldownConnectionCount: 1,
          cooldownUntil: "2026-08-03T18:00:00.000Z"
        }
      })
    ).toMatchObject({
      status: 200,
      body: { rateLimited: true }
    });
  });
});
