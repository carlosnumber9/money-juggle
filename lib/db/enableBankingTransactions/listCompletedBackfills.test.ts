import { describe, expect, it, vi } from "vitest";
import { createSupabaseQueryMock } from "../shared/supabaseQueryMock.testSupport";
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/serviceRole", () => ({
  createSupabaseServiceRoleClient: () => ({ from: mocks.from })
}));
import { listCompletedTransactionBackfillConnectionIds } from "./listCompletedBackfills";

describe("backfill completion after reconnection", () => {
  it("does not reuse completion from an earlier bank session", async () => {
    const metadata = { session_authorized_at: "2026-10-04T16:00:00Z" };
    const query = createSupabaseQueryMock([
      {
        bank_connection_id: "old-only",
        started_at: "2026-09-01T00:00:00Z",
        bank_connections: { provider_metadata: metadata }
      },
      {
        bank_connection_id: "current",
        started_at: "2026-10-04T16:01:00Z",
        bank_connections: { provider_metadata: metadata }
      },
      {
        bank_connection_id: "legacy",
        started_at: "2026-09-01T00:00:00Z",
        bank_connections: { provider_metadata: {} }
      }
    ]);
    mocks.from.mockReturnValue(query);
    await expect(
      listCompletedTransactionBackfillConnectionIds("owner")
    ).resolves.toEqual(new Set(["current", "legacy"]));
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(query.eq).toHaveBeenCalledWith("status", "succeeded");
  });
});
