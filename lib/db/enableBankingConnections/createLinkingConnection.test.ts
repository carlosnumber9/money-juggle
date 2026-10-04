import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseQueryMock } from "../shared/supabaseQueryMock.testSupport";
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  profile: vi.fn(),
  institution: vi.fn(),
  creation: vi.fn()
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/serviceRole", () => ({
  createSupabaseServiceRoleClient: () => ({ from: mocks.from })
}));
vi.mock("./ensureProfile", () => ({ ensureProfile: mocks.profile }));
vi.mock("./upsertInstitution", () => ({
  upsertInstitution: mocks.institution
}));
vi.mock("./creationEvents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./creationEvents")>()),
  insertCreationEvents: mocks.creation
}));
import { createLinkingEnableBankingConnection } from "./createLinkingConnection";

const input = {
  userId: "owner",
  email: "owner@example.com",
  aspsp: {
    name: "ING",
    country: "ES",
    logo: "",
    beta: false,
    maximum_consent_validity: 86400,
    psu_types: ["personal"],
    auth_methods: []
  },
  state: "new-state",
  redirectUrl: "https://example.com/callback",
  requestedAccess: { valid_until: "2026-10-05T16:00:00Z" },
  authorization: {
    authorization_id: "authorization",
    url: "https://example.com/authorize",
    psu_id_hash: "hash"
  },
  reconnectConnection: {
    id: "connection",
    status: "expired",
    provider_state: "old-state",
    provider_metadata: { account_identifications: { account: ["stable-hash"] } }
  }
};
describe("renewed authorization start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T16:00:00Z"));
    mocks.institution.mockResolvedValue("institution");
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => vi.useRealTimers());
  it("reuses the connection with a fresh state and clock while preserving account identifiers", async () => {
    const query = createSupabaseQueryMock({
      id: "connection",
      user_id: "owner",
      institution_id: "institution",
      status: "linking",
      provider_state: "new-state"
    });
    mocks.from.mockReturnValue(query);
    await createLinkingEnableBankingConnection(input);
    expect(query.insert).not.toHaveBeenCalled();
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        provider_state: "new-state",
        status: "linking",
        provider_metadata: expect.objectContaining({
          linking_started_at: "2026-10-04T16:00:00.000Z",
          account_identifications: { account: ["stable-hash"] }
        })
      })
    );
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(query.eq).toHaveBeenCalledWith("provider_state", "old-state");
    expect(query.or).toHaveBeenCalledWith(
      expect.stringContaining("sync_lease_until")
    );
  });
  it("does not record a new authorization after a concurrent start or active lease", async () => {
    mocks.from.mockReturnValue(
      createSupabaseQueryMock(null, { message: "No row matched" })
    );
    await expect(createLinkingEnableBankingConnection(input)).rejects.toThrow(
      "No row matched"
    );
    expect(mocks.creation).not.toHaveBeenCalled();
  });
});
