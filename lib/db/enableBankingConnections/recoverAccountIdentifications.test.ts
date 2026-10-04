import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/enableBanking/client", async () => ({
  ...(await import("@/lib/enableBanking/client/requestError")),
  getEnableBankingErrorMetadata: vi.fn(() => ({})),
  getEnableBankingSession: mocks.session
}));
import { recoverAccountIdentifications } from "./recoverAccountIdentifications";

const aspsp = { name: "CaixaBank", country: "ES" };
const input = {
  sessionId: "expired-session",
  aspsp,
  accounts: [{ id: "internal", provider_account_id: "historical-uid" }],
  identities: {}
};
describe("historical session identity recovery", () => {
  beforeEach(() => vi.clearAllMocks());
  it("recovers stable identity using the old session account UID even when expired", async () => {
    mocks.session.mockResolvedValue({
      aspsp,
      status: "EXPIRED",
      accounts_data: [
        { uid: "unrelated", identification_hash: "unrelated-hash" },
        { uid: "historical-uid", identification_hash: "stable-primary" }
      ]
    });
    await expect(recoverAccountIdentifications(input)).resolves.toEqual({
      internal: ["stable-primary"]
    });
    expect(mocks.session).toHaveBeenCalledWith("expired-session");
  });
  it("does not call the provider when stable identities are already stored", async () => {
    const identities = { internal: ["stable-primary"] };
    await expect(
      recoverAccountIdentifications({ ...input, identities })
    ).resolves.toEqual(identities);
    expect(mocks.session).not.toHaveBeenCalled();
  });
  it("allows manual recovery if the old session is unavailable", async () => {
    mocks.session.mockRejectedValue(new Error("not found"));
    await expect(recoverAccountIdentifications(input)).resolves.toEqual({});
  });
  it("rejects identity data from another institution", async () => {
    mocks.session.mockResolvedValue({
      aspsp: { ...aspsp, name: "ING" },
      accounts_data: [{ uid: "historical-uid", identification_hash: "wrong" }]
    });
    await expect(recoverAccountIdentifications(input)).resolves.toEqual({});
  });
  it("never guesses the old account from response ordering", async () => {
    mocks.session.mockResolvedValue({
      aspsp,
      accounts_data: [{ uid: "other-uid", identification_hash: "wrong" }]
    });
    await expect(recoverAccountIdentifications(input)).resolves.toEqual({});
  });
});
