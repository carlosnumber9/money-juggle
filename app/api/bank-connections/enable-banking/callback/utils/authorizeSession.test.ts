import type {
  EnableBankingAuthorizeSessionResponse,
  StoredBankConnection
} from "@/definitions";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeSession: vi.fn(),
  completeConnection: vi.fn(),
  failConnection: vi.fn(),
  getPsuHeaders: vi.fn()
}));

vi.mock("@/lib/db/enableBankingSync/connectionLease", () => ({
  withConnectionSyncLeases: vi.fn(async ({ bankConnectionIds, run }) => ({
    value: await run(new Set(bankConnectionIds))
  }))
}));

vi.mock("@/lib/enableBanking/client", async () => ({
  ...(await import("@/lib/enableBanking/client/requestError")),
  ...(await import("@/lib/enableBanking/client/providerErrors")),
  authorizeEnableBankingSession: mocks.authorizeSession
}));

vi.mock("@/lib/db/enableBankingConnections", () => ({
  completeEnableBankingConnection: mocks.completeConnection,
  failEnableBankingConnection: mocks.failConnection
}));

vi.mock("@/lib/db/enableBankingSync/interactivePsuHeaders", () => ({
  getInteractivePsuHeadersByConnection: mocks.getPsuHeaders
}));

import { withConnectionSyncLeases } from "@/lib/db/enableBankingSync/connectionLease";
import { BankAccountMatchError } from "@/lib/db/enableBankingConnections/accountMatching";
import { authorizeAndCompleteSession } from "./authorizeSession";

describe("authorizeAndCompleteSession", () => {
  const connection = {
    id: "connection-1",
    user_id: "user-1",
    institution_id: "institution-1",
    status: "linking",
    provider_state: "state-1"
  } satisfies StoredBankConnection;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPsuHeaders.mockResolvedValue(new Map());
  });

  it("fails an authorized session that exposes no accounts", async () => {
    mocks.authorizeSession.mockResolvedValue(createSession([]));

    await expect(
      authorizeAndCompleteSession({
        connection,
        code: "code-1",
        requestHeaders: new Headers()
      })
    ).resolves.toMatchObject({
      ok: false,
      status: "no-accounts-added",
      metadata: { account_count: 0, session_id: "session-1" }
    });

    expect(mocks.failConnection).toHaveBeenCalledWith({
      userId: "user-1",
      bankConnectionId: "connection-1",
      providerState: "state-1",
      providerStatus: "no-accounts-added",
      message:
        "Enable Banking authorized the session without returning any accounts.",
      metadata: { account_count: 0, session_id: "session-1" }
    });
    expect(mocks.getPsuHeaders).not.toHaveBeenCalled();
    expect(mocks.completeConnection).not.toHaveBeenCalled();
  });

  it("does not exchange a code while another callback owns the lease", async () => {
    vi.mocked(withConnectionSyncLeases).mockResolvedValueOnce({
      value: { ok: false, status: "connection-busy" },
      acquiredConnectionCount: 0,
      busyConnectionCount: 1
    });
    await expect(
      authorizeAndCompleteSession({
        connection,
        code: "code-1",
        requestHeaders: new Headers()
      })
    ).resolves.toMatchObject({ ok: false, status: "connection-busy" });
    expect(mocks.authorizeSession).not.toHaveBeenCalled();
    expect(mocks.failConnection).not.toHaveBeenCalled();
  });
  it("exposes a safe account-matching failure without discarding the callback state", async () => {
    mocks.authorizeSession.mockResolvedValue(
      createSession([{ uid: "account-1" }])
    );
    mocks.completeConnection.mockRejectedValueOnce(new BankAccountMatchError());
    await expect(
      authorizeAndCompleteSession({
        connection,
        code: "code-1",
        requestHeaders: new Headers()
      })
    ).resolves.toMatchObject({ ok: false, status: "account-match-required" });
    expect(mocks.failConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        providerState: "state-1",
        providerStatus: "account-match-required",
        message:
          "Enable Banking session was authorized but connection completion failed.",
        metadata: { phase: "account-matching", reason: "missing-identity" }
      })
    );
  });
  it("stores a session when at least one account is available", async () => {
    const session = createSession([{ uid: "account-1", currency: "EUR" }]);
    mocks.authorizeSession.mockResolvedValue(session);

    await expect(
      authorizeAndCompleteSession({
        connection,
        code: "code-1",
        requestHeaders: new Headers()
      })
    ).resolves.toEqual({ ok: true });

    expect(mocks.completeConnection).toHaveBeenCalledWith({
      userId: "user-1",
      bankConnectionId: "connection-1",
      providerState: "state-1",
      session,
      psuHeaders: undefined
    });
    expect(mocks.failConnection).not.toHaveBeenCalled();
  });
});

function createSession(
  accounts: EnableBankingAuthorizeSessionResponse["accounts"]
): EnableBankingAuthorizeSessionResponse {
  return {
    session_id: "session-1",
    accounts,
    aspsp: { name: "Trade Republic", country: "ES" },
    psu_type: "personal",
    access: {
      balances: true,
      transactions: true,
      valid_until: "2026-11-10T17:37:10.552Z"
    }
  };
}
