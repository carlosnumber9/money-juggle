import type { EnableBankingTransactionResource } from "@/definitions";
import { getAccountFingerprint } from "@/lib/db/shared/accountFingerprint";

import { getLast4 } from "./dateValues";
import { getTextValue, normalizeText } from "./textValues";
import type { StoredAccountForTransactionSync } from "./types";

export function getDescription(
  transaction: EnableBankingTransactionResource
): string | null {
  const remittance = transaction.remittance_information_unstructured;

  if (Array.isArray(remittance) && remittance.length > 0) {
    return getTextValue(remittance);
  }

  const unstructured = getTextValue(remittance);

  if (unstructured) {
    return unstructured;
  }

  if (transaction.remittance_information?.length) {
    return getTextValue(transaction.remittance_information);
  }

  return getTextValue(transaction.description);
}

export function getCounterpartyName(
  transaction: EnableBankingTransactionResource
): string | null {
  return (
    getTextValue(transaction.counterparty_name) ??
    getTextValue(transaction.creditor_name) ??
    getTextValue(transaction.debtor_name) ??
    null
  );
}

export function getCounterpartyAccountLast4(
  transaction: EnableBankingTransactionResource,
  signedAmount: string,
  ownAccount: StoredAccountForTransactionSync
): string | null {
  return (
    getCounterpartyAccountValue(transaction, signedAmount, ownAccount)?.last4 ??
    null
  );
}

export function getCounterpartyAccountFingerprint(
  transaction: EnableBankingTransactionResource,
  signedAmount: string,
  ownAccount: StoredAccountForTransactionSync
): string | null {
  return (
    getCounterpartyAccountValue(transaction, signedAmount, ownAccount)
      ?.fingerprint ?? null
  );
}

export function getBookingStatus(
  transaction: EnableBankingTransactionResource
): "booked" | "pending" | "information" {
  const status = normalizeText(transaction.booking_status ?? transaction.status)
    .toLowerCase()
    .replace(/_/g, "-");

  if (status.includes("pending")) {
    return "pending";
  }

  if (status.includes("information") || status.includes("info")) {
    return "information";
  }

  return "booked";
}

function getCounterpartyAccountValue(
  transaction: EnableBankingTransactionResource,
  signedAmount: string,
  ownAccount: StoredAccountForTransactionSync
): CounterpartyAccountCandidate | null {
  const preferredAccount =
    getAmountDirection(signedAmount) === "credit"
      ? transaction.debtor_account
      : transaction.creditor_account;
  const fallbackAccount =
    getAmountDirection(signedAmount) === "credit"
      ? transaction.creditor_account
      : transaction.debtor_account;

  return getFirstExternalAccountCandidate(
    [preferredAccount, fallbackAccount],
    ownAccount
  );
}

function getAmountDirection(signedAmount: string): "credit" | "debit" {
  return signedAmount.trim().startsWith("-") ? "debit" : "credit";
}

function getFirstExternalAccountCandidate(
  accounts: Array<EnableBankingTransactionResource["creditor_account"]>,
  ownAccount: StoredAccountForTransactionSync
): CounterpartyAccountCandidate | null {
  for (const account of accounts) {
    const candidate = getAccountCandidate(account);

    if (candidate && !isOwnAccountCandidate(candidate, ownAccount)) {
      return candidate;
    }
  }

  return null;
}

type CounterpartyAccountCandidate = {
  last4: string | null;
  fingerprint: string | null;
};

function getAccountCandidate(
  account: EnableBankingTransactionResource["creditor_account"]
): CounterpartyAccountCandidate | null {
  const last4 =
    getLast4(account?.iban) ?? getLast4(account?.other?.identification);
  const fingerprint =
    getAccountFingerprint(account?.iban) ??
    getAccountFingerprint(account?.other?.identification);

  if (!last4 && !fingerprint) {
    return null;
  }

  return { last4, fingerprint };
}

function isOwnAccountCandidate(
  candidate: CounterpartyAccountCandidate,
  ownAccount: StoredAccountForTransactionSync
): boolean {
  return (
    (Boolean(candidate.last4) && candidate.last4 === ownAccount.iban_last4) ||
    (Boolean(candidate.fingerprint) &&
      candidate.fingerprint === ownAccount.iban_fingerprint)
  );
}
