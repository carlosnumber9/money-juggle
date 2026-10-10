import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  StoredConnectionForTransactionSync,
  TransactionSyncResult
} from "./types";
const mocks = vi.hoisted(() => ({
  connections: vi.fn(),
  sync: vi.fn(),
  completed: vi.fn(),
  expire: vi.fn()
}));
vi.mock("server-only", () => ({}));
vi.mock("./listConnections", () => ({
  listConnectionsForTransactionSync: mocks.connections
}));
vi.mock("./syncConnectionTransactions", () => ({
  syncConnectionTransactions: mocks.sync
}));
vi.mock("./listCompletedBackfills", () => ({
  listCompletedTransactionBackfillConnectionIds: mocks.completed
}));
vi.mock("../enableBankingSync/invalidSession", () => ({
  expireConnectionConsent: mocks.expire
}));
import { syncEnableBankingTransactions } from "./syncTransactions";

const connection: StoredConnectionForTransactionSync = {
  id: "connection",
  user_id: "owner",
  status: "linked",
  provider_session_id: "session",
  provider_rate_limited_until: null,
  last_transaction_synced_at: "2026-10-04T15:00:00Z",
  accounts: [
    {
      id: "account",
      provider_account_id: "provider",
      name: "Cuenta",
      iban_last4: null,
      iban_fingerprint: null
    }
  ]
};
const input = {
  userId: "owner",
  dateFrom: "2026-09-01",
  dateTo: "2026-10-04",
  mode: "incremental" as const
};
const successful: TransactionSyncResult = {
  synced: true,
  attemptedAccountCount: 1,
  succeededAccountCount: 1,
  partialAccountCount: 0,
  deferredAccountCount: 0,
  issues: [],
  completedConnectionIds: ["connection"],
  failedAccountCount: 0,
  rateLimitedAccountCount: 0,
  cooldownConnectionCount: 0,
  cooldownUntil: null,
  freshConnectionCount: 0
};

describe("transaction scheduling", () => {
  it("does not complete a bank row until its persistence operation resolves", async () => {
    let release!: () => void;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    mocks.sync.mockImplementation(async ({ onPersist }) => {
      onPersist?.();
      await wait;
      return successful;
    });
    const onProgress = vi.fn();
    const operation = syncEnableBankingTransactions({
      ...input,
      force: true,
      onProgress
    });
    // Promise turns let eligibility and the mocked persistence boundary run.
    for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ status: "running", reason: "persisting" })
    );
    expect(onProgress).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" })
    );
    release();
    await operation;
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({
        bankConnectionId: "connection",
        status: "completed"
      })
    );
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T16:00:00Z"));
    mocks.connections.mockResolvedValue([connection]);
    mocks.expire.mockResolvedValue(false);
    mocks.completed.mockResolvedValue(new Set());
    mocks.sync.mockResolvedValue(successful);
  });
  afterEach(() => vi.useRealTimers());
  it("does not fetch expired consent even on a forced refresh", async () => {
    mocks.expire.mockResolvedValue(true);
    await syncEnableBankingTransactions({ ...input, force: true });
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("reports an incomplete download while respecting its retry deadline", async () => {
    mocks.connections.mockResolvedValue([
      {
        ...connection,
        transaction_sync_incomplete: true,
        transaction_retry_after: "2026-10-04T16:15:00Z"
      }
    ]);
    await expect(
      syncEnableBankingTransactions({ ...input, force: true })
    ).resolves.toMatchObject({
      attemptedAccountCount: 0,
      partialAccountCount: 0,
      deferredAccountCount: 1,
      issues: [
        {
          bankConnectionId: "connection",
          resource: "transactions",
          kind: "deferred",
          retryAt: "2026-10-04T16:15:00Z"
        }
      ],
      freshConnectionCount: 0
    });
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("retries incomplete data once the deadline passes despite a recent earlier success", async () => {
    mocks.connections.mockResolvedValue([
      {
        ...connection,
        transaction_sync_incomplete: true,
        transaction_retry_after: "2026-10-04T16:00:00Z"
      }
    ]);
    await expect(syncEnableBankingTransactions(input)).resolves.toMatchObject({
      succeededAccountCount: 1,
      freshConnectionCount: 0
    });
    expect(mocks.sync).toHaveBeenCalledTimes(1);
  });
  it("continues to skip fully completed recent data", async () => {
    await expect(syncEnableBankingTransactions(input)).resolves.toMatchObject({
      freshConnectionCount: 1
    });
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("reports provider cooldown as deferred without a new attempt or partial download", async () => {
    mocks.connections.mockResolvedValue([
      { ...connection, provider_rate_limited_until: "2026-10-04T16:15:00Z" }
    ]);
    await expect(
      syncEnableBankingTransactions({ ...input, force: true })
    ).resolves.toMatchObject({
      attemptedAccountCount: 0,
      partialAccountCount: 0,
      failedAccountCount: 0,
      deferredAccountCount: 1,
      issues: [{ kind: "deferred" }]
    });
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("does not sync connections without an acquired lease", async () => {
    await syncEnableBankingTransactions({
      ...input,
      force: true,
      bankConnectionIds: new Set(["another-connection"])
    });
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("merges partial results without counting them as succeeded", async () => {
    mocks.sync.mockResolvedValue({
      ...successful,
      succeededAccountCount: 0,
      partialAccountCount: 1
    });
    await expect(
      syncEnableBankingTransactions({ ...input, force: true })
    ).resolves.toMatchObject({
      partialAccountCount: 1,
      succeededAccountCount: 0
    });
  });
});
