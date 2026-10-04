import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseQueryMock } from "../shared/supabaseQueryMock.testSupport";
const mocks = vi.hoisted(() => ({ from: vi.fn(), consent: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/serviceRole", () => ({
  createSupabaseServiceRoleClient: () => ({ from: mocks.from })
}));
vi.mock("./consentEvents", () => ({ insertConsentEvent: mocks.consent }));
import { failEnableBankingConnection } from "./failConnection";

const input = {
  userId: "owner",
  bankConnectionId: "connection",
  providerState: "expected-state",
  providerStatus: "failed",
  message: "Authorization failed",
  metadata: { reason: "cancelled" }
};
describe("failed authorization persistence", () => {
  beforeEach(() => vi.clearAllMocks());
  it("preserves account identity metadata and scopes failure to the current callback", async () => {
    const load = createSupabaseQueryMock({
      provider_metadata: {
        account_identifications: { account: ["hash"] },
        aspsp: { name: "ING" }
      }
    });
    const write = createSupabaseQueryMock({ id: "connection" });
    mocks.from.mockReturnValueOnce(load).mockReturnValueOnce(write);
    await failEnableBankingConnection(input);
    expect(write.update).toHaveBeenCalledWith({
      status: "error",
      provider_metadata: {
        account_identifications: { account: ["hash"] },
        aspsp: { name: "ING" },
        reason: "cancelled"
      }
    });
    expect(write.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(write.eq).toHaveBeenCalledWith("provider_state", "expected-state");
    expect(write.eq).toHaveBeenCalledWith("status", "linking");
  });
  it("does not add a failure event when the callback no longer owns the connection", async () => {
    mocks.from
      .mockReturnValueOnce(createSupabaseQueryMock({ provider_metadata: {} }))
      .mockReturnValueOnce(createSupabaseQueryMock(null));
    await failEnableBankingConnection(input);
    expect(mocks.consent).not.toHaveBeenCalled();
  });
});
