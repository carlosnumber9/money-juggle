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

vi.mock("@/lib/enableBanking/client", () => ({
  authorizeEnableBankingSession: mocks.authorizeSession
}));

vi.mock("@/lib/db/enableBankingConnections", () => ({
  completeEnableBankingConnection: mocks.completeConnection,
  failEnableBankingConnection: mocks.failConnection
}));

vi.mock("@/lib/db/enableBankingSync/interactivePsuHeaders", () => ({
  getInteractivePsuHeadersByConnection: mocks.getPsuHeaders
}));

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
      providerStatus: "no-accounts-added",
      message:
        "Enable Banking authorized the session without returning any accounts.",
      metadata: { account_count: 0, session_id: "session-1" }
    });
    expect(mocks.getPsuHeaders).not.toHaveBeenCalled();
    expect(mocks.completeConnection).not.toHaveBeenCalled();
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
