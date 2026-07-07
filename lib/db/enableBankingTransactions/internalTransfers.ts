import "server-only";

import type {
  StoredMonthlyTransactionRow,
  StoredOwnAccountForTransferMatching
} from "./types";

const MAX_PAIRED_TRANSFER_DAY_DISTANCE = 3;

export function getInternalTransferTransactionIds(
  rows: StoredMonthlyTransactionRow[],
  ownAccounts: StoredOwnAccountForTransferMatching[]
): Set<string> {
  const internalTransferIds = new Set<string>();
  const accountFingerprints = getAccountIdsByFingerprint(ownAccounts);

  for (const row of rows) {
    const matchedAccountIds = row.counterparty_account_fingerprint
      ? accountFingerprints.get(row.counterparty_account_fingerprint)
      : undefined;

    if (matchedAccountIds?.some((accountId) => accountId !== row.account_id)) {
      internalTransferIds.add(row.id);
    }
  }

  markPairedLast4Transfers(rows, internalTransferIds);

  return internalTransferIds;
}

function getAccountIdsByFingerprint(
  accounts: StoredOwnAccountForTransferMatching[]
) {
  const accountIdsByFingerprint = new Map<string, string[]>();

  for (const account of accounts) {
    const fingerprint = account.iban_fingerprint;

    if (!fingerprint) {
      continue;
    }

    accountIdsByFingerprint.set(fingerprint, [
      ...(accountIdsByFingerprint.get(fingerprint) ?? []),
      account.id
    ]);
  }

  return accountIdsByFingerprint;
}

function markPairedLast4Transfers(
  rows: StoredMonthlyTransactionRow[],
  internalTransferIds: Set<string>
) {
  const pairedIds = new Set<string>();

  for (const left of rows) {
    if (internalTransferIds.has(left.id) || pairedIds.has(left.id)) {
      continue;
    }

    const right = rows.find(
      (candidate) =>
        candidate.id !== left.id &&
        !internalTransferIds.has(candidate.id) &&
        !pairedIds.has(candidate.id) &&
        isPairedLast4Transfer(left, candidate)
    );

    if (right) {
      pairedIds.add(left.id);
      pairedIds.add(right.id);
      internalTransferIds.add(left.id);
      internalTransferIds.add(right.id);
    }
  }
}

function isPairedLast4Transfer(
  left: StoredMonthlyTransactionRow,
  right: StoredMonthlyTransactionRow
): boolean {
  const leftAccount = getAccount(left);
  const rightAccount = getAccount(right);

  return (
    left.account_id !== right.account_id &&
    left.currency === right.currency &&
    getAmountKey(left.amount) === getAmountKey(right.amount) &&
    haveOppositeSigns(left.amount, right.amount) &&
    areDatesClose(left.booking_date, right.booking_date) &&
    haveCompatibleCounterpartySuffixes({
      leftCounterpartyLast4: left.counterparty_account_last4,
      leftAccountLast4: leftAccount?.iban_last4 ?? null,
      rightCounterpartyLast4: right.counterparty_account_last4,
      rightAccountLast4: rightAccount?.iban_last4 ?? null
    })
  );
}

function haveCompatibleCounterpartySuffixes(input: {
  leftCounterpartyLast4: string | null;
  leftAccountLast4: string | null;
  rightCounterpartyLast4: string | null;
  rightAccountLast4: string | null;
}): boolean {
  const leftPointsToRight =
    Boolean(input.leftCounterpartyLast4) &&
    input.leftCounterpartyLast4 === input.rightAccountLast4;
  const rightPointsToLeft =
    Boolean(input.rightCounterpartyLast4) &&
    input.rightCounterpartyLast4 === input.leftAccountLast4;

  return (
    (leftPointsToRight &&
      (rightPointsToLeft || !input.rightCounterpartyLast4)) ||
    (rightPointsToLeft && (leftPointsToRight || !input.leftCounterpartyLast4))
  );
}

function getAccount(row: StoredMonthlyTransactionRow) {
  return Array.isArray(row.accounts) ? (row.accounts[0] ?? null) : row.accounts;
}

function getAmountKey(value: string | number): string {
  const amount = parseDecimal(value);
  const absolute = amount < 0n ? -amount : amount;

  return absolute.toString();
}

function haveOppositeSigns(
  left: string | number,
  right: string | number
): boolean {
  return parseDecimal(left) * parseDecimal(right) < 0n;
}

function areDatesClose(left: string | null, right: string | null): boolean {
  if (!left || !right) {
    return false;
  }

  const leftTime = Date.parse(`${left}T00:00:00.000Z`);
  const rightTime = Date.parse(`${right}T00:00:00.000Z`);

  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
    return false;
  }

  const dayDistance = Math.abs(leftTime - rightTime) / (24 * 60 * 60 * 1000);

  return dayDistance <= MAX_PAIRED_TRANSFER_DAY_DISTANCE;
}

function parseDecimal(value: string | number): bigint {
  const trimmed = String(value).trim();
  const sign = trimmed.startsWith("-") ? -1n : 1n;
  const unsigned = trimmed.replace(/^[+-]/, "");
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const normalizedFraction = fraction.padEnd(6, "0").slice(0, 6);

  return (
    sign * (BigInt(whole || "0") * 1_000_000n + BigInt(normalizedFraction))
  );
}
