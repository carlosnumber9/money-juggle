import { describe, expect, it } from "vitest";
import {
  BankAccountMatchError,
  matchSessionAccounts,
  type StoredAccountIdentity
} from "./accountMatching";

const stored: StoredAccountIdentity = {
  id: "internal-account",
  provider_account_id: "old-provider-account",
  iban_fingerprint: "iban-hash",
  identificationHashes: ["provider-hash"]
};

describe("account continuity across authorizations", () => {
  it("does not treat shared secondary hashes as unique account identities", () => {
    expect(
      matchSessionAccounts(
        [
          {
            ...stored,
            identificationHashes: ["primary-old", "shared-secondary"]
          }
        ],
        [
          {
            provider_account_id: "new",
            iban_fingerprint: null,
            identificationHashes: ["primary-new", "shared-secondary"]
          }
        ]
      )
    ).toEqual([null]);
  });
  it("permits explicit owner confirmation for legacy identities without guessing", () => {
    expect(
      matchSessionAccounts(
        [{ ...stored, iban_fingerprint: null, identificationHashes: [] }],
        [{ ...stored, provider_account_id: "new", iban_fingerprint: null }],
        [stored.id]
      )
    ).toEqual([stored.id]);
  });
  it("rejects a foreign or duplicate owner selection before writes", () => {
    const legacy = {
      ...stored,
      iban_fingerprint: null,
      identificationHashes: []
    };
    expect(() =>
      matchSessionAccounts(
        [legacy],
        [{ ...legacy, provider_account_id: "new" }],
        ["foreign"]
      )
    ).toThrow("could not be matched");
    expect(() =>
      matchSessionAccounts(
        [legacy],
        [
          { ...legacy, provider_account_id: "new" },
          { ...legacy, provider_account_id: "newer" }
        ],
        [stored.id, stored.id]
      )
    ).toThrow("could not be matched");
  });
  it("does not permit confirmation to override a known strong identity", () => {
    expect(() => matchSessionAccounts([stored], [stored], [null])).toThrow(
      "could not be matched"
    );
    expect(() =>
      matchSessionAccounts(
        [stored],
        [
          {
            ...stored,
            provider_account_id: "new",
            iban_fingerprint: "conflicting",
            identificationHashes: ["other-primary"]
          }
        ],
        [stored.id]
      )
    ).toThrow("could not be matched");
  });
  it("rejects contradictory strong identifiers even when one identifies a single candidate", () => {
    expect(() =>
      matchSessionAccounts(
        [stored],
        [{ ...stored, iban_fingerprint: "different-iban" }]
      )
    ).toThrow("could not be matched");
  });
  it("validates the complete selection length and duplicate returned UIDs", () => {
    expect(() => matchSessionAccounts([stored], [stored], [])).toThrow(
      "could not be matched"
    );
    expect(() => matchSessionAccounts([], [stored, stored])).toThrow(
      "could not be matched"
    );
  });
  it("preserves the internal ID when the provider ID changes", () => {
    expect(
      matchSessionAccounts(
        [stored],
        [{ ...stored, provider_account_id: "new-provider-account" }]
      )
    ).toEqual([stored.id]);
  });
  it("matches provider identification hashes without an IBAN", () => {
    expect(
      matchSessionAccounts(
        [{ ...stored, iban_fingerprint: null }],
        [{ ...stored, provider_account_id: "new", iban_fingerprint: null }]
      )
    ).toEqual([stored.id]);
  });
  it("matches legacy rows by IBAN fingerprint without stored provider hashes", () => {
    expect(
      matchSessionAccounts(
        [{ ...stored, identificationHashes: [] }],
        [{ ...stored, provider_account_id: "new" }]
      )
    ).toEqual([stored.id]);
  });
  it("accepts an unchanged provider account ID on a retry", () => {
    expect(
      matchSessionAccounts(
        [{ ...stored, iban_fingerprint: null, identificationHashes: [] }],
        [{ ...stored, iban_fingerprint: null, identificationHashes: [] }]
      )
    ).toEqual([stored.id]);
  });
  it("inserts a genuinely distinct account", () => {
    expect(
      matchSessionAccounts(
        [stored],
        [
          {
            provider_account_id: "different",
            iban_fingerprint: "different-iban",
            identificationHashes: ["different-hash"]
          }
        ]
      )
    ).toEqual([null]);
  });
  it("does not guess when a legacy account has no stable identity", () => {
    expect(() =>
      matchSessionAccounts(
        [{ ...stored, iban_fingerprint: null, identificationHashes: [] }],
        [{ ...stored, provider_account_id: "new" }]
      )
    ).toThrow(BankAccountMatchError);
  });
  it("rejects ambiguous matches before a persistence plan is returned", () => {
    expect(() =>
      matchSessionAccounts([stored, { ...stored, id: "second" }], [stored])
    ).toThrow(BankAccountMatchError);
  });
  it("rejects two returned accounts matching the same historical account", () => {
    expect(() =>
      matchSessionAccounts(
        [stored],
        [stored, { ...stored, provider_account_id: "new" }]
      )
    ).toThrow(BankAccountMatchError);
  });
  it("rejects conflicting strong identifiers", () => {
    expect(() =>
      matchSessionAccounts(
        [
          stored,
          {
            ...stored,
            id: "second",
            provider_account_id: "other",
            iban_fingerprint: "other-iban",
            identificationHashes: ["other-hash"]
          }
        ],
        [{ ...stored, identificationHashes: ["other-hash"] }]
      )
    ).toThrow(BankAccountMatchError);
  });
});
