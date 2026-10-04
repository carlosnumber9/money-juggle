export class BankAccountMatchError extends Error {
  constructor(public readonly reason = "missing-identity") {
    super(
      "Bank accounts could not be matched safely. Existing financial history was preserved."
    );
    this.name = "BankAccountMatchError";
  }
}

export type StoredAccountIdentity = {
  id: string;
  provider_account_id: string;
  iban_fingerprint: string | null;
  identificationHashes: string[];
};

export type ReturnedAccountIdentity = Omit<StoredAccountIdentity, "id">;

export function matchSessionAccounts(
  stored: StoredAccountIdentity[],
  returned: ReturnedAccountIdentity[],
  confirmedMatches?: Array<string | null>
): Array<string | null> {
  if (confirmedMatches && confirmedMatches.length !== returned.length)
    throw new BankAccountMatchError("invalid-confirmation");
  if (
    new Set(returned.map((account) => account.provider_account_id)).size !==
    returned.length
  )
    throw new BankAccountMatchError("duplicate-returned-account");
  const usedIds = new Set<string>();
  return returned.map((account, index) => {
    const candidates = stored.filter(
      (previous) =>
        previous.provider_account_id === account.provider_account_id ||
        Boolean(
          account.iban_fingerprint &&
          previous.iban_fingerprint === account.iban_fingerprint
        ) ||
        Boolean(
          account.identificationHashes[0] &&
          account.identificationHashes[0] === previous.identificationHashes[0]
        )
    );
    if (candidates.length > 1)
      throw new BankAccountMatchError("ambiguous-identity");
    const candidate = candidates[0];
    if (candidate) {
      if (
        (account.iban_fingerprint &&
          candidate.iban_fingerprint &&
          account.iban_fingerprint !== candidate.iban_fingerprint) ||
        (account.identificationHashes[0] &&
          candidate.identificationHashes[0] &&
          account.identificationHashes[0] !== candidate.identificationHashes[0])
      )
        throw new BankAccountMatchError("conflicting-identity");
      if (confirmedMatches && confirmedMatches[index] !== candidate.id)
        throw new BankAccountMatchError("conflicting-confirmation");
      if (usedIds.has(candidate.id))
        throw new BankAccountMatchError("duplicate-match");
      usedIds.add(candidate.id);
      return candidate.id;
    }
    if (confirmedMatches) {
      const id = confirmedMatches[index];
      if (id === null) return null;
      const selected = stored.find((previous) => previous.id === id);
      if (!selected || usedIds.has(id))
        throw new BankAccountMatchError("invalid-confirmation");
      if (
        (account.iban_fingerprint &&
          selected.iban_fingerprint &&
          account.iban_fingerprint !== selected.iban_fingerprint) ||
        (account.identificationHashes[0] &&
          selected.identificationHashes[0] &&
          account.identificationHashes[0] !== selected.identificationHashes[0])
      )
        throw new BankAccountMatchError("conflicting-confirmation");
      usedIds.add(id);
      return id;
    }
    // New accounts require identifiers that distinguish them from every stored account.
    const cannotDistinguish = stored.some(
      (previous) =>
        !(account.iban_fingerprint && previous.iban_fingerprint) &&
        !(
          account.identificationHashes.length > 0 &&
          previous.identificationHashes.length > 0
        )
    );
    if (cannotDistinguish) throw new BankAccountMatchError();
    return null;
  });
}
