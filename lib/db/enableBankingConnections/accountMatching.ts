export class BankAccountMatchError extends Error {
  constructor() {
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
  returned: ReturnedAccountIdentity[]
): Array<string | null> {
  const usedIds = new Set<string>();
  return returned.map((account) => {
    const candidates = stored.filter(
      (previous) =>
        previous.provider_account_id === account.provider_account_id ||
        Boolean(
          account.iban_fingerprint &&
          previous.iban_fingerprint === account.iban_fingerprint
        ) ||
        account.identificationHashes.some((hash) =>
          previous.identificationHashes.includes(hash)
        )
    );
    if (candidates.length > 1) throw new BankAccountMatchError();
    const candidate = candidates[0];
    if (candidate) {
      if (usedIds.has(candidate.id)) throw new BankAccountMatchError();
      usedIds.add(candidate.id);
      return candidate.id;
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
