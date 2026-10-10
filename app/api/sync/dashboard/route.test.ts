import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { BankSyncReporter } from "@/definitions";
vi.mock("server-only", () => ({}));
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: vi.fn()
}));
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  allowed: vi.fn(),
  connections: vi.fn(),
  leases: vi.fn(),
  headers: vi.fn(),
  balances: vi.fn(),
  transactions: vi.fn()
}));
vi.mock("@/lib/supabase/currentUser", () => ({
  getCurrentSupabaseUser: mocks.user
}));
vi.mock("@/lib/auth/allowlist", () => ({ isEmailAllowed: mocks.allowed }));
vi.mock("@/lib/db/enableBankingConnections", () => ({
  listUserEnableBankingConnections: mocks.connections
}));
vi.mock("@/lib/db/enableBankingSync/connectionLease", () => ({
  withConnectionSyncLeases: mocks.leases
}));
vi.mock("@/lib/db/enableBankingSync/interactivePsuHeaders", () => ({
  getInteractivePsuHeadersByConnection: mocks.headers
}));
vi.mock("@/lib/db/enableBankingBalances", () => ({
  syncStaleEnableBankingBalances: mocks.balances
}));
vi.mock("@/lib/db/enableBankingTransactions", () => ({
  syncEnableBankingTransactions: mocks.transactions
}));
import { POST } from "./route";
import { readDashboardStream } from "@/app/(private)/DashboardSyncControls/stream";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "owner", email: "owner@example.com" });
  mocks.allowed.mockReturnValue(true);
  mocks.connections.mockResolvedValue([
    {
      id: "bank",
      status: "linked",
      institution: { name: "ING" },
      accounts: [{ id: "account", iban_last4: "1234" }],
      provider_session_id: "secret-session"
    }
  ]);
  mocks.headers.mockResolvedValue(new Map());
  mocks.leases.mockImplementation(async ({ run }) => ({
    value: await run(new Set(["bank"])),
    acquiredConnectionCount: 1,
    busyConnectionCount: 0
  }));
  mocks.balances.mockImplementation(
    async ({ onProgress }: { onProgress?: BankSyncReporter }) => {
      onProgress?.({
        bankConnectionId: "bank",
        resource: "balances",
        status: "completed"
      });
      return {
        synced: true,
        succeededConnectionCount: 1,
        failedConnectionCount: 0,
        rateLimitedConnectionCount: 0,
        cooldownConnectionCount: 0,
        cooldownUntil: null
      };
    }
  );
  mocks.transactions.mockImplementation(
    async ({ onProgress }: { onProgress?: BankSyncReporter }) => {
      onProgress?.({
        bankConnectionId: "bank",
        resource: "transactions",
        status: "skipped",
        reason: "fresh"
      });
      return {
        synced: false,
        succeededAccountCount: 0,
        partialAccountCount: 0,
        failedAccountCount: 0,
        rateLimitedAccountCount: 0,
        cooldownConnectionCount: 0,
        cooldownUntil: null
      };
    }
  );
});

describe("dashboard progress endpoint", () => {
  it.each([
    [null, true, 401],
    [{ id: "owner" }, false, 403]
  ])(
    "rejects access before opening a stream",
    async (user, allowed, status) => {
      mocks.user.mockResolvedValue(user);
      mocks.allowed.mockReturnValue(allowed);
      const response = await POST(
        new NextRequest("https://app.example/api/sync/dashboard", {
          method: "POST",
          headers: { Accept: "text/event-stream" }
        })
      );
      expect(response.status).toBe(status);
      expect(response.headers.get("Content-Type")).not.toContain(
        "text/event-stream"
      );
      expect(mocks.connections).not.toHaveBeenCalled();
    }
  );
  it("preserves JSON, session ownership and forced manual updates", async () => {
    const response = await POST(
      new NextRequest(
        "https://app.example/api/sync/dashboard?force=true&userId=other",
        { method: "POST" }
      )
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ hasErrors: false });
    expect(mocks.connections).toHaveBeenCalledWith("owner", {
      useServiceRole: true
    });
    expect(mocks.balances).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "owner", force: true })
    );
    expect(mocks.transactions).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "owner",
        force: true,
        mode: "incremental"
      })
    );
  });
  it("streams banks and sequential resources without account details or credentials", async () => {
    const response = await POST(
      new NextRequest("https://app.example/api/sync/dashboard", {
        method: "POST",
        headers: { Accept: "text/event-stream" }
      })
    );
    const progress = vi.fn();
    await expect(
      readDashboardStream(response, progress)
    ).resolves.toMatchObject({ hasErrors: false });
    const events = progress.mock.calls.map(([event]) => event);
    expect(events.find((event) => event.type === "banks")).toEqual({
      type: "banks",
      banks: [{ id: "bank", name: "ING" }]
    });
    expect(
      events
        .filter((event) => event.type === "phase")
        .map((event) => [event.phase, event.status])
    ).toEqual([
      ["connections", "running"],
      ["connections", "completed"],
      ["balances", "running"],
      ["balances", "completed"],
      ["transactions", "running"],
      ["transactions", "completed"]
    ]);
    expect(mocks.balances.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.transactions.mock.invocationCallOrder[0]
    );
    expect(JSON.stringify(events)).not.toMatch(/1234|secret-session|iban/);
  });
  it("settles banks invalidated during balance work rather than leaving them pending", async () => {
    mocks.transactions.mockResolvedValue({
      synced: false,
      succeededAccountCount: 0,
      partialAccountCount: 0,
      failedAccountCount: 0,
      rateLimitedAccountCount: 0,
      cooldownConnectionCount: 0,
      cooldownUntil: null
    });
    mocks.connections
      .mockResolvedValueOnce([
        {
          id: "bank",
          status: "linked",
          institution: { name: "ING" },
          accounts: [{ id: "account" }]
        }
      ])
      .mockResolvedValueOnce([{ id: "bank", status: "expired", accounts: [] }]);
    const response = await POST(
      new NextRequest("https://app.example/api/sync/dashboard", {
        method: "POST",
        headers: { Accept: "text/event-stream" }
      })
    );
    const progress = vi.fn();
    await readDashboardStream(response, progress);
    expect(progress).toHaveBeenCalledWith({
      type: "bank",
      bankConnectionId: "bank",
      resource: "transactions",
      status: "warning",
      reason: "expired"
    });
  });
});
