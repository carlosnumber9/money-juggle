import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  allowed: vi.fn(),
  confirm: vi.fn(),
  revalidate: vi.fn()
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/allowlist", () => ({ isEmailAllowed: mocks.allowed }));
vi.mock("@/lib/supabase/currentUser", () => ({
  getCurrentSupabaseUser: mocks.user
}));
vi.mock("@/lib/db/enableBankingConnections/accountReview", () => ({
  confirmBankAccountReview: mocks.confirm
}));
import { confirmAccountReview } from "./actions";

const connectionId = "0c795896-e1e9-4635-afa7-158781459e36";
const reviewId = "11111111-1111-4111-8111-111111111111";
function form() {
  const data = new FormData();
  data.set("connectionId", connectionId);
  data.set("reviewId", reviewId);
  data.set("confirmed", "on");
  data.append("accountMatch", "new");
  return data;
}
describe("account review server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.mockResolvedValue({
      id: "authenticated-owner",
      email: "owner@example.com"
    });
    mocks.allowed.mockReturnValue(true);
  });
  it("requires an authenticated allowlisted owner before any write", async () => {
    mocks.allowed.mockReturnValue(false);
    await expect(confirmAccountReview(form())).rejects.toThrow(
      "NEXT_REDIRECT:/login"
    );
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
  it("requires explicit confirmation", async () => {
    const data = form();
    data.delete("confirmed");
    await expect(confirmAccountReview(data)).rejects.toThrow("?status=invalid");
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
  it("uses the authenticated user rather than a client-submitted owner", async () => {
    const data = form();
    data.set("userId", "attacker");
    await expect(confirmAccountReview(data)).rejects.toThrow(
      "NEXT_REDIRECT:/bank-connection-result?status=linked"
    );
    expect(mocks.confirm).toHaveBeenCalledWith({
      userId: "authenticated-owner",
      bankConnectionId: connectionId,
      reviewId,
      requestHeaders: expect.any(Headers),
      matches: [null]
    });
    expect(mocks.revalidate).toHaveBeenCalledWith("/");
  });
});
