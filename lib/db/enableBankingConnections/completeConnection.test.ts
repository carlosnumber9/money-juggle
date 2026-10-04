import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseQueryMock } from "../shared/supabaseQueryMock.testSupport";
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  persist: vi.fn(),
  consent: vi.fn(),
  balances: vi.fn()
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/serviceRole", () => ({
  createSupabaseServiceRoleClient: () => ({ from: mocks.from })
}));
vi.mock("./persistSessionAccounts", () => ({
  persistSessionAccounts: mocks.persist
}));
vi.mock("./consentEvents", () => ({ insertConsentEvent: mocks.consent }));
vi.mock("@/lib/db/enableBankingBalances", () => ({
  syncEnableBankingConnectionBalances: mocks.balances
}));
import { completeEnableBankingConnection } from "./completeConnection";
import { BankAccountMatchError } from "./accountMatching";

const aspsp = { name: "ING", country: "ES" };
const stored = {
  status: "linking",
  provider_state: "state",
  provider_session_id: "old-session",
  provider_metadata: { aspsp, custom: "preserved" }
};
const input = {
  userId: "owner",
  bankConnectionId: "connection",
  providerState: "state",
  session: {
    session_id: "new-session",
    accounts: [{ uid: "provider-account" }],
    aspsp,
    psu_type: "personal" as const,
    access: { valid_until: "2026-12-01T00:00:00Z" }
  }
};

describe("reconnection completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.persist.mockResolvedValue({ "account-id": ["provider-hash"] });
  });
  it("activates the new session only after account persistence and clears stale sync state", async () => {
    const load = createSupabaseQueryMock(stored);
    const write = createSupabaseQueryMock({ id: "connection" });
    mocks.from.mockReturnValueOnce(load).mockReturnValueOnce(write);
    await completeEnableBankingConnection(input);
    expect(load.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(write.eq).toHaveBeenCalledWith("provider_state", "state");
    expect(write.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "linked",
        provider_session_id: "new-session",
        last_transaction_synced_at: null,
        provider_rate_limited_until: null,
        provider_metadata: expect.objectContaining({
          custom: "preserved",
          transaction_retry_after: null,
          account_identifications: { "account-id": ["provider-hash"] }
        })
      })
    );
    expect(mocks.persist.mock.invocationCallOrder[0]).toBeLessThan(
      write.update.mock.invocationCallOrder[0]
    );
    expect(mocks.consent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "reconnected" })
    );
  });
  it("retains a sanitized authorized session when legacy account matching needs review", async () => {
    const write = createSupabaseQueryMock({ id: "connection" });
    mocks.from
      .mockReturnValueOnce(createSupabaseQueryMock(stored))
      .mockReturnValueOnce(write);
    mocks.persist.mockRejectedValueOnce(
      new BankAccountMatchError("missing-identity")
    );
    await expect(completeEnableBankingConnection(input)).rejects.toThrow(
      BankAccountMatchError
    );
    expect(write.update).toHaveBeenCalledWith(
      expect.objectContaining({
        provider_metadata: expect.objectContaining({
          pending_reconnection: expect.objectContaining({
            session: expect.objectContaining({ session_id: "new-session" })
          })
        })
      })
    );
    expect(write.eq).toHaveBeenCalledWith("status", "linking");
    expect(write.eq).toHaveBeenCalledWith("provider_state", "state");
    expect(mocks.consent).not.toHaveBeenCalled();
  });
  it("rejects owner confirmation for a replaced attempt before any account write", async () => {
    mocks.from.mockReturnValue(
      createSupabaseQueryMock({ ...stored, status: "error" })
    );
    await expect(
      completeEnableBankingConnection({
        ...input,
        confirmation: { reviewId: "expired", matches: ["old-account"] }
      })
    ).rejects.toThrow("expired or changed");
    expect(mocks.persist).not.toHaveBeenCalled();
  });
  it("clears pending data after owner-confirmed completion", async () => {
    const identifiers = [{ iban_fingerprint: null, iban_last4: "1234" }];
    const write = createSupabaseQueryMock({ id: "connection" });
    mocks.from
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          ...stored,
          status: "error",
          provider_metadata: {
            ...stored.provider_metadata,
            pending_reconnection: {
              reviewId: "review",
              expiresAt: "2099-01-01T00:00:00Z",
              session: input.session,
              identifiers
            }
          }
        })
      )
      .mockReturnValueOnce(write);
    await completeEnableBankingConnection({
      ...input,
      confirmation: { reviewId: "review", matches: ["old-account"] }
    });
    expect(mocks.persist).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmedMatches: ["old-account"],
        identifiers
      })
    );
    expect(write.eq).toHaveBeenCalledWith("status", "error");
    expect(write.update).toHaveBeenCalledWith(
      expect.objectContaining({
        provider_metadata: expect.objectContaining({
          pending_reconnection: null
        })
      })
    );
  });
  it("does not mutate accounts for an outdated callback", async () => {
    mocks.from.mockReturnValue(
      createSupabaseQueryMock({ ...stored, provider_state: "newer-state" })
    );
    await expect(completeEnableBankingConnection(input)).rejects.toThrow(
      "state has changed"
    );
    expect(mocks.persist).not.toHaveBeenCalled();
  });
  it("rejects a session for a different institution", async () => {
    mocks.from.mockReturnValue(createSupabaseQueryMock(stored));
    await expect(
      completeEnableBankingConnection({
        ...input,
        session: {
          ...input.session,
          aspsp: { ...aspsp, name: "Different bank" }
        }
      })
    ).rejects.toThrow("institution does not match");
    expect(mocks.persist).not.toHaveBeenCalled();
  });
  it("never presents a new session as linked if account persistence fails", async () => {
    mocks.from.mockReturnValue(createSupabaseQueryMock(stored));
    mocks.persist.mockRejectedValueOnce(new Error("account matching failed"));
    await expect(completeEnableBankingConnection(input)).rejects.toThrow(
      "account matching failed"
    );
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.consent).not.toHaveBeenCalled();
  });
});
