import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./persistTransactionRows", () => ({
  persistTransactionRows: vi.fn()
}));
vi.mock("./syncRuns", () => ({
  finishSyncRun: vi.fn()
}));
vi.mock("./updateSyncTimestamp", () => ({
  updateConnectionSyncTimestamp: vi.fn()
}));

import { persistRowsAndFinishRun } from "./finishConnectionSync";
import { finishSyncRun } from "./syncRuns";
import { updateConnectionSyncTimestamp } from "./updateSyncTimestamp";

const finishSyncRunMock = vi.mocked(finishSyncRun);
const updateConnectionSyncTimestampMock = vi.mocked(
  updateConnectionSyncTimestamp
);

describe("persistRowsAndFinishRun", () => {
  beforeEach(() => {
    finishSyncRunMock.mockReset();
    updateConnectionSyncTimestampMock.mockReset();
  });

  it("records tolerated pagination truncation without blocking freshness", async () => {
    const warning = {
      account_id: "account-id",
      message:
        "Enable Banking returned a repeated transaction continuation key."
    };

    await persistRowsAndFinishRun({
      userId: "user-id",
      connection: {
        id: "connection-id",
        user_id: "user-id",
        status: "linked",
        provider_session_id: "session-id",
        provider_rate_limited_until: null,
        last_transaction_synced_at: null,
        accounts: []
      },
      syncRunId: "sync-run-id",
      fetchedAt: "2026-08-30T09:00:00.000Z",
      dateFrom: "2026-07-01",
      dateTo: "2026-08-30",
      mode: "incremental",
      rows: [],
      failures: [],
      warnings: [warning]
    });

    expect(finishSyncRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "partial",
        metadata: {
          transaction_count: 0,
          failures: [],
          warnings: [warning]
        }
      })
    );
    expect(updateConnectionSyncTimestampMock).toHaveBeenCalledWith({
      userId: "user-id",
      bankConnectionId: "connection-id",
      fetchedAt: "2026-08-30T09:00:00.000Z"
    });
  });
});
