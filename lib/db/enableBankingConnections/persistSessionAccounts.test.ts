import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseQueryMock } from "../shared/supabaseQueryMock.testSupport";
const mocks = vi.hoisted(() => ({ from: vi.fn(), recover: vi.fn() }));
vi.mock("./recoverAccountIdentifications", () => ({
  recoverAccountIdentifications: mocks.recover
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/serviceRole", () => ({
  createSupabaseServiceRoleClient: () => ({ from: mocks.from })
}));
vi.mock("@/lib/db/shared/accountFingerprint", () => ({
  getAccountFingerprint: (value: string | undefined) =>
    value ? "iban-hash" : null
}));
import { persistSessionAccounts } from "./persistSessionAccounts";
import { BankAccountMatchError } from "./accountMatching";

const previous = {
  id: "historical-account",
  provider_account_id: "old-provider",
  iban_fingerprint: "iban-hash"
};
const input = {
  userId: "owner",
  bankConnectionId: "connection",
  accounts: [
    {
      uid: "new-provider",
      currency: "EUR",
      account_id: { iban: "test-iban" },
      identification_hash: "provider-hash"
    }
  ],
  providerMetadata: {}
};

describe("reconnection account persistence", () => {
  beforeEach(() => vi.clearAllMocks());
  it("recovers legacy identities and preserves account IDs when there is no IBAN fingerprint", async () => {
    mocks.recover.mockResolvedValue({
      "historical-account": ["provider-hash"]
    });
    const lookup = createSupabaseQueryMock([
      { ...previous, iban_fingerprint: null }
    ]);
    const write = createSupabaseQueryMock();
    mocks.from.mockReturnValueOnce(lookup).mockReturnValueOnce(write);
    await persistSessionAccounts({
      ...input,
      previousSessionId: "expired-session",
      aspsp: { name: "CaixaBank", country: "ES" }
    });
    expect(write.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: "historical-account",
          provider_account_id: "new-provider"
        })
      ],
      expect.anything()
    );
    expect(mocks.recover).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "expired-session" })
    );
  });
  it("preserves history through explicit confirmation if legacy identity recovery fails", async () => {
    const write = createSupabaseQueryMock();
    mocks.from
      .mockReturnValueOnce(
        createSupabaseQueryMock([{ ...previous, iban_fingerprint: null }])
      )
      .mockReturnValueOnce(write);
    await persistSessionAccounts({
      ...input,
      confirmedMatches: ["historical-account"],
      identifiers: [{ iban_fingerprint: "iban-hash", iban_last4: "1234" }]
    });
    expect(write.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: "historical-account",
          iban_last4: "1234",
          iban_fingerprint: "iban-hash"
        })
      ],
      expect.anything()
    );
  });
  it("keeps the account primary key and leaves financial records untouched", async () => {
    const lookup = createSupabaseQueryMock([previous]);
    const write = createSupabaseQueryMock();
    mocks.from.mockReturnValueOnce(lookup).mockReturnValueOnce(write);
    await expect(persistSessionAccounts(input)).resolves.toEqual({
      "historical-account": ["provider-hash"]
    });
    expect(lookup.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(lookup.eq).toHaveBeenCalledWith("bank_connection_id", "connection");
    expect(write.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: "historical-account",
          provider_account_id: "new-provider",
          user_id: "owner",
          bank_connection_id: "connection"
        })
      ],
      { onConflict: "id", defaultToNull: false }
    );
    expect(mocks.from.mock.calls.map((call) => call[0])).toEqual([
      "accounts",
      "accounts"
    ]);
  });
  it("preserves omitted accounts as inactive instead of deleting them", async () => {
    const lookup = createSupabaseQueryMock([
      previous,
      {
        ...previous,
        id: "omitted",
        provider_account_id: "omitted-provider",
        iban_fingerprint: "other-iban"
      }
    ]);
    const write = createSupabaseQueryMock();
    const inactive = createSupabaseQueryMock();
    mocks.from
      .mockReturnValueOnce(lookup)
      .mockReturnValueOnce(write)
      .mockReturnValueOnce(inactive);
    await persistSessionAccounts(input);
    expect(inactive.update).toHaveBeenCalledWith({ status: "inactive" });
    expect(inactive.in).toHaveBeenCalledWith("id", ["omitted"]);
    expect(inactive.eq).toHaveBeenCalledWith("user_id", "owner");
  });
  it("validates every returned account before writing any account", async () => {
    mocks.from.mockReturnValue(
      createSupabaseQueryMock([{ ...previous, iban_fingerprint: null }])
    );
    await expect(persistSessionAccounts(input)).rejects.toThrow(
      BankAccountMatchError
    );
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it("can reconnect using retained provider hashes without an IBAN", async () => {
    const write = createSupabaseQueryMock();
    mocks.from
      .mockReturnValueOnce(
        createSupabaseQueryMock([{ ...previous, iban_fingerprint: null }])
      )
      .mockReturnValueOnce(write);
    await persistSessionAccounts({
      ...input,
      accounts: [
        {
          uid: "new-provider",
          currency: "EUR",
          identification_hash: "provider-hash"
        }
      ],
      providerMetadata: {
        account_identifications: { "historical-account": ["provider-hash"] }
      }
    });
    expect(write.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ id: "historical-account" })],
      expect.anything()
    );
  });
  it("does not continue after a database lookup failure", async () => {
    mocks.from.mockReturnValue(
      createSupabaseQueryMock(null, { message: "lookup failed" })
    );
    await expect(persistSessionAccounts(input)).rejects.toThrow(
      "lookup failed"
    );
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
});
