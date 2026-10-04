import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseQueryMock } from "../shared/supabaseQueryMock.testSupport";

const mocks = vi.hoisted(() => ({ from: vi.fn(), consent: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/serviceRole", () => ({
  createSupabaseServiceRoleClient: () => ({ from: mocks.from })
}));
vi.mock("../enableBankingConnections/consentEvents", () => ({
  insertConsentEvent: mocks.consent
}));
import {
  expireConnectionConsent,
  invalidateConnectionSession
} from "./invalidSession";

const input = {
  userId: "owner",
  bankConnectionId: "connection",
  providerSessionId: "old-session",
  providerError: "CLOSED_SESSION"
};

describe("invalid session persistence", () => {
  beforeEach(() => vi.clearAllMocks());
  it("updates only the owner's current linked session and records its lifecycle", async () => {
    const query = createSupabaseQueryMock({ id: "connection" });
    mocks.from.mockReturnValue(query);
    await expect(invalidateConnectionSession(input)).resolves.toBe(true);
    expect(query.update).toHaveBeenCalledWith({ status: "expired" });
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(query.eq).toHaveBeenCalledWith("provider_session_id", "old-session");
    expect(query.eq).toHaveBeenCalledWith("status", "linked");
    expect(mocks.consent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "expired", userId: "owner" })
    );
  });
  it("does not record another event when a new session replaced the old one", async () => {
    mocks.from.mockReturnValue(createSupabaseQueryMock(null));
    await invalidateConnectionSession(input);
    expect(mocks.consent).not.toHaveBeenCalled();
  });
  it("does not change consent after a signing or transport failure", async () => {
    await expect(
      invalidateConnectionSession({
        ...input,
        providerError: "UNAUTHORIZED_ACCESS"
      })
    ).resolves.toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("skips provider access when a stored consent expired", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T16:00:00Z"));
    mocks.from.mockReturnValue(createSupabaseQueryMock({ id: "connection" }));
    await expect(
      expireConnectionConsent({
        ...input,
        consentExpiresAt: "2026-10-04T15:59:59Z"
      })
    ).resolves.toBe(true);
    vi.useRealTimers();
  });
});
