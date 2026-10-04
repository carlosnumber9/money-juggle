import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseQueryMock } from "../shared/supabaseQueryMock.testSupport";
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/serviceRole", () => ({
  createSupabaseServiceRoleClient: () => ({ from: mocks.from })
}));
import { getConnectionForReconnection } from "./reconnection";

const aspsp = {
  name: "ING",
  country: "ES",
  maximum_consent_validity: 90 * 86400,
  logo: "",
  psu_types: ["personal"],
  beta: false,
  auth_methods: []
};
const input = { userId: "owner", bankConnectionId: "connection", aspsp };
const stored = {
  id: "connection",
  status: "expired",
  created_at: "2026-07-01T00:00:00Z",
  institutions: { name: "ING", country: "ES" },
  provider_metadata: {}
};

describe("reconnection authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T16:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());
  it("scopes eligibility to the authenticated owner and provider", async () => {
    const query = createSupabaseQueryMock(stored);
    mocks.from.mockReturnValue(query);
    await expect(getConnectionForReconnection(input)).resolves.toEqual(stored);
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(query.eq).toHaveBeenCalledWith("provider", "enable_banking");
  });
  it("rejects an unknown or other-owner connection", async () => {
    mocks.from.mockReturnValue(createSupabaseQueryMock(null));
    await expect(getConnectionForReconnection(input)).rejects.toThrow(
      "cannot be reauthorized"
    );
  });
  it("rejects an institution mismatch", async () => {
    mocks.from.mockReturnValue(createSupabaseQueryMock(stored));
    await expect(
      getConnectionForReconnection({
        ...input,
        aspsp: { ...aspsp, country: "DE" }
      })
    ).rejects.toThrow("cannot be reauthorized");
  });
  it("does not replace a linked session with valid consent", async () => {
    mocks.from.mockReturnValue(
      createSupabaseQueryMock({
        ...stored,
        status: "linked",
        consent_expires_at: "2026-12-01T00:00:00Z"
      })
    );
    await expect(getConnectionForReconnection(input)).rejects.toThrow(
      "cannot be reauthorized"
    );
  });
  it("uses the latest authorization clock when retrying an old connection", async () => {
    mocks.from.mockReturnValue(
      createSupabaseQueryMock({
        ...stored,
        status: "linking",
        provider_metadata: { linking_started_at: "2026-10-04T15:50:00Z" }
      })
    );
    await expect(getConnectionForReconnection(input)).rejects.toThrow(
      "cannot be reauthorized"
    );
    mocks.from.mockReturnValue(
      createSupabaseQueryMock({
        ...stored,
        status: "linking",
        provider_metadata: { linking_started_at: "2026-10-04T15:45:00Z" }
      })
    );
    await expect(getConnectionForReconnection(input)).resolves.toMatchObject({
      status: "linking"
    });
  });
});
