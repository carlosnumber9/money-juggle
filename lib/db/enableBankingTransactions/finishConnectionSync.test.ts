import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./persistTransactionRows", () => ({
  persistTransactionRows: vi.fn()
}));
vi.mock("./syncRuns", () => ({
  finishSyncRun: vi.fn()
}));
vi.mock("./updateSyncOutcome", () => ({
  updateTransactionSyncOutcome: vi.fn()
}));
vi.mock("./updateSyncTimestamp", () => ({
  updateConnectionSyncTimestamp: vi.fn()
}));

import { persistRowsAndFinishRun } from "./finishConnectionSync";
import { finishSyncRun } from "./syncRuns";
import { updateTransactionSyncOutcome } from "./updateSyncOutcome";
import { persistTransactionRows } from "./persistTransactionRows";
import { updateConnectionSyncTimestamp } from "./updateSyncTimestamp";

const finishSyncRunMock = vi.mocked(finishSyncRun);
const updateConnectionSyncTimestampMock = vi.mocked(
  updateConnectionSyncTimestamp
);

function emptyInput() {
  return {
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
    fetchedAt: "2026-10-04T16:00:00Z",
    dateFrom: "2026-09-01",
    dateTo: "2026-10-04",
    mode: "incremental" as const,
    rows: [],
    failures: [],
    warnings: []
  };
}

describe("persistRowsAndFinishRun", () => {
  it("advances freshness for a genuinely complete empty response", async () => {
    const input = emptyInput();
    await persistRowsAndFinishRun(input);
    expect(updateConnectionSyncTimestampMock).toHaveBeenCalledWith({
      userId: input.userId,
      bankConnectionId: input.connection.id,
      providerSessionId: "session-id",
      fetchedAt: input.fetchedAt
    });
    expect(updateTransactionSyncOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ incomplete: false })
    );
    expect(finishSyncRunMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "succeeded" })
    );
  });
  it("does not mark an account failure as fresh", async () => {
    await persistRowsAndFinishRun({
      ...emptyInput(),
      failures: [new Error("Failed account")]
    });
    expect(updateConnectionSyncTimestampMock).not.toHaveBeenCalled();
    expect(finishSyncRunMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" })
    );
    expect(updateTransactionSyncOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ incomplete: true })
    );
  });
  it("never advances freshness when persistence fails", async () => {
    vi.mocked(persistTransactionRows).mockRejectedValueOnce(
      new Error("Database failure")
    );
    await expect(persistRowsAndFinishRun(emptyInput())).rejects.toThrow(
      "Database failure"
    );
    expect(updateConnectionSyncTimestampMock).not.toHaveBeenCalled();
    expect(finishSyncRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        errorCode: "transaction-upsert-failed"
      })
    );
  });
  beforeEach(() => {
    vi.clearAllMocks();
    finishSyncRunMock.mockReset();
    updateConnectionSyncTimestampMock.mockReset();
  });

  it("records pagination truncation without advancing freshness", async () => {
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
    expect(updateConnectionSyncTimestampMock).not.toHaveBeenCalled();
  });
});
