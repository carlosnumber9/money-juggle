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
    ).toMatchObject({
      status: 200,
      body: {
        partialFailure: true,
        hasErrors: false,
        incomplete: true,
        retryPending: false
      }
    });
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
        hasErrors: false,
        incomplete: false,
        retryPending: false,
        feedback: [],
        completedTransactionBanks: [],
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
      body: {
        rateLimited: true,
        hasErrors: false,
        retryPending: true,
        incomplete: false
      }
    });
  });
  it("reports a scheduled transaction retry as information rather than a new partial fetch", () => {
    const response = getDashboardSyncResult({
      balances: succeededBalances,
      transactions: {
        ...succeededTransactions,
        succeededAccountCount: 0,
        deferredAccountCount: 2,
        issues: [
          {
            bankConnectionId: "caixa",
            resource: "transactions",
            kind: "deferred",
            retryAt: "2026-10-04T18:55:00Z"
          }
        ]
      },
      connections: [{ id: "caixa", institution: { name: "CaixaBank" } }]
    });
    expect(response).toMatchObject({
      status: 200,
      body: {
        hasErrors: false,
        incomplete: false,
        retryPending: true,
        feedback: [{ bankName: "CaixaBank", kind: "deferred" }]
      }
    });
  });
  it("keeps real errors visible alongside successful balances and partial transactions", () => {
    const response = getDashboardSyncResult({
      balances: succeededBalances,
      transactions: {
        ...succeededTransactions,
        partialAccountCount: 1,
        failedAccountCount: 1,
        issues: [
          {
            bankConnectionId: "caixa",
            resource: "transactions",
            kind: "error",
            retryAt: null
          },
          {
            bankConnectionId: "tr",
            resource: "transactions",
            kind: "partial",
            retryAt: null
          }
        ]
      },
      connections: [
        { id: "caixa", institution: { name: "CaixaBank" } },
        { id: "tr", institution: { name: "Trade Republic" } }
      ]
    });
    expect(response).toMatchObject({
      status: 200,
      body: {
        hasErrors: true,
        incomplete: true,
        feedback: [
          { bankName: "CaixaBank", kind: "error" },
          { bankName: "Trade Republic", kind: "partial" }
        ]
      }
    });
  });
  it("does not resolve a bank while another connection at that institution remains incomplete", () => {
    const response = getDashboardSyncResult({
      balances: succeededBalances,
      transactions: {
        ...succeededTransactions,
        completedConnectionIds: ["old"],
        partialAccountCount: 1,
        issues: [
          {
            bankConnectionId: "new",
            resource: "transactions",
            kind: "partial",
            retryAt: null
          }
        ]
      },
      connections: [
        { id: "old", institution: { name: "Trade Republic" } },
        { id: "new", institution: { name: "Trade Republic" } }
      ]
    });
    expect(response.body.completedTransactionBanks).toEqual([]);
  });
});
