import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseQueryMock } from "../shared/supabaseQueryMock.testSupport";
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/serviceRole", () => ({
  createSupabaseServiceRoleClient: () => ({ from: mocks.from })
}));
import { updateTransactionSyncOutcome } from "./updateSyncOutcome";

const input = {
  userId: "owner",
  bankConnectionId: "connection",
  providerSessionId: "session",
  fetchedAt: "2026-10-04T16:00:00Z",
  incomplete: true
};
describe("persisted transaction retry state", () => {
  beforeEach(() => vi.clearAllMocks());
  it("preserves provider settings while storing a session-scoped retry deadline", async () => {
    const load = createSupabaseQueryMock({
      provider_metadata: { aspsp: { name: "ING" } }
    });
    const write = createSupabaseQueryMock();
    mocks.from.mockReturnValueOnce(load).mockReturnValueOnce(write);
    await updateTransactionSyncOutcome(input);
    expect(write.update).toHaveBeenCalledWith({
      provider_metadata: {
        aspsp: { name: "ING" },
        transaction_sync_incomplete: true,
        transaction_retry_after: "2026-10-04T16:15:00.000Z"
      }
    });
    expect(write.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(write.eq).toHaveBeenCalledWith("provider_session_id", "session");
    expect(write.eq).toHaveBeenCalledWith("status", "linked");
  });
  it("clears the deadline after a full success", async () => {
    const write = createSupabaseQueryMock();
    mocks.from
      .mockReturnValueOnce(createSupabaseQueryMock({ provider_metadata: {} }))
      .mockReturnValueOnce(write);
    await updateTransactionSyncOutcome({ ...input, incomplete: false });
    expect(write.update).toHaveBeenCalledWith({
      provider_metadata: {
        transaction_sync_incomplete: false,
        transaction_retry_after: null
      }
    });
  });
  it("does not overwrite a connection that was reauthorized or invalidated", async () => {
    mocks.from.mockReturnValue(createSupabaseQueryMock(null));
    await updateTransactionSyncOutcome(input);
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
});
