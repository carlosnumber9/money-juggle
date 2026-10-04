import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/enableBanking/client", () => ({
  getEnableBankingAccountTransactions: vi.fn()
}));
vi.mock("../enableBankingSync/rateLimitCooldown", () => ({
  setConnectionRateLimitCooldown: vi.fn()
}));
vi.mock("../enableBankingSync/invalidSession", () => ({
  invalidateConnectionSession: vi.fn().mockResolvedValue(false)
}));
vi.mock("./finishConnectionSync", () => ({
  persistRowsAndFinishRun: vi.fn()
}));
vi.mock("./listConnections", () => ({
  listConnectionsForTransactionSync: vi.fn()
}));
vi.mock("./syncRuns", () => ({
  createSyncRun: vi.fn()
}));

import { getEnableBankingAccountTransactions } from "@/lib/enableBanking/client";

import { invalidateConnectionSession } from "../enableBankingSync/invalidSession";
import { setConnectionRateLimitCooldown } from "../enableBankingSync/rateLimitCooldown";
import { EnableBankingRequestError } from "@/lib/enableBanking/client/requestError";
import { persistRowsAndFinishRun } from "./finishConnectionSync";
import { createSyncRun } from "./syncRuns";
import { syncConnectionTransactions } from "./syncConnectionTransactions";

const getTransactionsMock = vi.mocked(getEnableBankingAccountTransactions);
const persistRowsAndFinishRunMock = vi.mocked(persistRowsAndFinishRun);
const createSyncRunMock = vi.mocked(createSyncRun);

function createInput() {
  return {
    userId: "user-id",
    connection: {
      id: "connection-id",
      user_id: "user-id",
      status: "linked",
      provider_session_id: "session-id",
      provider_rate_limited_until: null,
      last_transaction_synced_at: null,
      accounts: ["first", "second"].map((id) => ({
        id,
        provider_account_id: `provider-${id}`,
        name: "Cuenta",
        iban_last4: null,
        iban_fingerprint: null
      }))
    },
    dateFrom: "2026-09-01",
    dateTo: "2026-10-04",
    mode: "incremental" as const
  };
}

describe("syncConnectionTransactions", () => {
  it("only resolves a connection after every account finishes normally", async () => {
    getTransactionsMock.mockResolvedValue({
      transactions: [],
      paginationTruncated: false
    });
    await expect(
      syncConnectionTransactions(createInput())
    ).resolves.toMatchObject({
      succeededAccountCount: 2,
      issues: [],
      completedConnectionIds: ["connection-id"]
    });
  });
  it("stops requesting remaining accounts after an invalid-session response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new EnableBankingRequestError("Session expired", 401, {
      error: "EXPIRED_SESSION",
      message: "Expired"
    });
    getTransactionsMock.mockRejectedValueOnce(error);
    vi.mocked(invalidateConnectionSession).mockResolvedValueOnce(true);
    await expect(
      syncConnectionTransactions(createInput())
    ).resolves.toMatchObject({
      failedAccountCount: 1,
      succeededAccountCount: 0
    });
    expect(getTransactionsMock).toHaveBeenCalledTimes(1);
    expect(invalidateConnectionSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-id",
        providerSessionId: "session-id",
        providerError: "EXPIRED_SESSION"
      })
    );
  });
  it("retains downloaded rows and applies cooldown after a later-page rate limit", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = new EnableBankingRequestError("Rate limited", 429, {
      error: "ASPSP_RATE_LIMIT_EXCEEDED",
      message: "Limit"
    });
    getTransactionsMock.mockResolvedValueOnce({
      transactions: [
        {
          transaction_id: "saved",
          booking_status: "booked",
          booking_date: "2026-10-04",
          transaction_amount: { amount: "-10.00", currency: "EUR" }
        }
      ],
      paginationTruncated: true,
      paginationTruncationReason: "request-failed",
      pageError: error
    });
    await expect(
      syncConnectionTransactions(createInput())
    ).resolves.toMatchObject({
      partialAccountCount: 1,
      rateLimitedAccountCount: 1,
      synced: true
    });
    expect(getTransactionsMock).toHaveBeenCalledTimes(1);
    expect(setConnectionRateLimitCooldown).toHaveBeenCalledTimes(1);
    expect(persistRowsAndFinishRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: [expect.objectContaining({ provider_transaction_id: "saved" })],
        warnings: [
          expect.objectContaining({
            provider_error: "ASPSP_RATE_LIMIT_EXCEEDED",
            rate_limited: true
          })
        ]
      })
    );
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invalidateConnectionSession).mockResolvedValue(false);
    getTransactionsMock.mockReset();
    persistRowsAndFinishRunMock.mockReset();
    createSyncRunMock.mockReset();
    createSyncRunMock.mockResolvedValue("sync-run-id");
  });

  it("persists completed pages and records repeated-key truncation", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    getTransactionsMock.mockResolvedValue({
      transactions: [
        {
          transaction_id: "provider-transaction-id",
          booking_status: "booked",
          booking_date: "2026-08-29",
          transaction_amount: { amount: "-10.00", currency: "EUR" }
        }
      ],
      paginationTruncated: true
    });

    const result = await syncConnectionTransactions({
      userId: "user-id",
      connection: {
        id: "connection-id",
        user_id: "user-id",
        status: "linked",
        provider_session_id: "session-id",
        provider_rate_limited_until: null,
        last_transaction_synced_at: null,
        accounts: [
          {
            id: "account-id",
            provider_account_id: "provider-account-id",
            name: "Cuenta",
            iban_last4: "6311",
            iban_fingerprint: null
          }
        ]
      },
      dateFrom: "2026-07-01",
      dateTo: "2026-08-30",
      mode: "incremental"
    });

    expect(result).toMatchObject({
      synced: true,
      attemptedAccountCount: 1,
      succeededAccountCount: 0,
      partialAccountCount: 1,
      failedAccountCount: 0,
      issues: [
        expect.objectContaining({
          bankConnectionId: "connection-id",
          kind: "partial",
          resource: "transactions"
        })
      ],
      rateLimitedAccountCount: 0
    });
    expect(persistRowsAndFinishRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: [
          expect.objectContaining({
            account_id: "account-id",
            provider_transaction_id: "provider-transaction-id"
          })
        ],
        failures: [],
        warnings: [
          expect.objectContaining({
            account_id: "account-id",
            message:
              "Enable Banking returned a repeated transaction continuation key.",
            rate_limited: false
          })
        ]
      })
    );
    expect(warning).toHaveBeenCalledWith(
      "Enable Banking transaction pagination truncated",
      expect.objectContaining({ account_id: "account-id" })
    );
  });
});
