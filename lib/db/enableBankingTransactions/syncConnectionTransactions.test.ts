import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/enableBanking/client", () => ({
  getEnableBankingAccountTransactions: vi.fn()
}));
vi.mock("../enableBankingSync/rateLimitCooldown", () => ({
  setConnectionRateLimitCooldown: vi.fn()
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

import { persistRowsAndFinishRun } from "./finishConnectionSync";
import { createSyncRun } from "./syncRuns";
import { syncConnectionTransactions } from "./syncConnectionTransactions";

const getTransactionsMock = vi.mocked(getEnableBankingAccountTransactions);
const persistRowsAndFinishRunMock = vi.mocked(persistRowsAndFinishRun);
const createSyncRunMock = vi.mocked(createSyncRun);

describe("syncConnectionTransactions", () => {
  beforeEach(() => {
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
      succeededAccountCount: 1,
      failedAccountCount: 0,
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
