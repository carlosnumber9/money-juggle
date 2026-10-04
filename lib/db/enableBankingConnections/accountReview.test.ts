import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseQueryMock } from "../shared/supabaseQueryMock.testSupport";
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  complete: vi.fn(),
  lease: vi.fn(),
  session: vi.fn(),
  psuHeaders: vi.fn()
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ from: mocks.from })
}));
vi.mock("./completeConnection", () => ({
  completeEnableBankingConnection: mocks.complete
}));
vi.mock("@/lib/enableBanking/client", () => ({
  getEnableBankingSession: mocks.session
}));
vi.mock("@/lib/db/enableBankingSync/interactivePsuHeaders", () => ({
  getInteractivePsuHeadersByConnection: mocks.psuHeaders
}));
vi.mock("@/lib/db/enableBankingSync/connectionLease", () => ({
  withConnectionSyncLeases: mocks.lease
}));
import {
  loadBankAccountReview,
  confirmBankAccountReview
} from "./accountReview";

const pending = {
  reviewId: "review",
  expiresAt: "2099-01-01T00:00:00Z",
  session: {
    session_id: "new-session",
    aspsp: { name: "CaixaBank", country: "ES" },
    access: { valid_until: "2099-01-01T00:00:00Z" },
    psu_type: "personal",
    accounts: [{ uid: "private-provider-uid", identification_hash: "stable" }]
  },
  identifiers: [{ iban_fingerprint: null, iban_last4: "1234" }]
};
const connection = {
  id: "connection",
  provider_state: "current-state",
  status: "error",
  provider_metadata: { pending_reconnection: pending },
  accounts: []
};
const input = {
  userId: "owner",
  bankConnectionId: "connection",
  reviewId: "review",
  matches: ["historical-id"],
  requestHeaders: new Headers()
};
describe("authenticated bank account review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({
      status: "AUTHORIZED",
      aspsp: pending.session.aspsp
    });
    mocks.psuHeaders.mockResolvedValue(
      new Map([["connection", { "Psu-Ip-Address": "203.0.113.1" }]])
    );
    mocks.lease.mockImplementation(async ({ run, bankConnectionIds }) => ({
      value: await run(new Set(bankConnectionIds))
    }));
  });
  it("scopes pending review reads to its owner, provider and failed connection", async () => {
    const query = createSupabaseQueryMock(connection);
    mocks.from.mockReturnValue(query);
    await expect(
      loadBankAccountReview("owner", "connection")
    ).resolves.toMatchObject({ pending: { reviewId: "review" } });
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(query.eq).toHaveBeenCalledWith("provider", "enable_banking");
    expect(query.eq).toHaveBeenCalledWith("status", "error");
  });
  it("does not expose another owner's nonexistent connection", async () => {
    mocks.from.mockReturnValue(createSupabaseQueryMock(null));
    await expect(
      loadBankAccountReview("other", "connection")
    ).resolves.toBeNull();
  });
  it("completes using the retained server session while holding the lease", async () => {
    mocks.from.mockReturnValue(createSupabaseQueryMock(connection));
    await confirmBankAccountReview(input);
    expect(mocks.complete).toHaveBeenCalledWith({
      userId: "owner",
      bankConnectionId: "connection",
      providerState: "current-state",
      session: pending.session,
      psuHeaders: { "Psu-Ip-Address": "203.0.113.1" },
      confirmation: { reviewId: "review", matches: ["historical-id"] }
    });
  });
  it("rejects a replayed or expired review before completing", async () => {
    mocks.from.mockReturnValue(createSupabaseQueryMock(connection));
    await expect(
      confirmBankAccountReview({ ...input, reviewId: "superseded" })
    ).rejects.toThrow("expired or changed");
    mocks.from.mockReturnValue(
      createSupabaseQueryMock({
        ...connection,
        provider_metadata: {
          pending_reconnection: {
            ...pending,
            expiresAt: "2000-01-01T00:00:00Z"
          }
        }
      })
    );
    await expect(confirmBankAccountReview(input)).rejects.toThrow(
      "expired or changed"
    );
    expect(mocks.complete).not.toHaveBeenCalled();
  });
  it("does not complete while another callback owns the lease", async () => {
    mocks.lease.mockImplementationOnce(async ({ run }) => ({
      value: await run(new Set())
    }));
    await expect(confirmBankAccountReview(input)).rejects.toThrow("busy");
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.complete).not.toHaveBeenCalled();
  });
  it("rejects a revoked or closed provider session before any account mutation", async () => {
    mocks.from.mockReturnValue(createSupabaseQueryMock(connection));
    mocks.session.mockResolvedValue({
      status: "CLOSED",
      aspsp: pending.session.aspsp
    });
    await expect(confirmBankAccountReview(input)).rejects.toThrow(
      "no longer authorized"
    );
    expect(mocks.complete).not.toHaveBeenCalled();
  });
});
