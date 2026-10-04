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
