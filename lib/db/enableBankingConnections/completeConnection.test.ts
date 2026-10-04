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
