import { createHash } from "node:crypto";

import { normalizeText } from "./text-values";

export function getStableIdentity(input: {
  accountId: string;
  providerInternalTransactionId: string | null;
  providerTransactionId: string | null;
  entryReference: string | null;
  endToEndId: string | null;
  deduplicationFingerprint: string;
}) {
  if (input.providerInternalTransactionId) {
    return {
      source: "provider_internal_transaction_id",
      key: `provider_internal:${input.accountId}:${input.providerInternalTransactionId}`
    };
  }

  if (input.providerTransactionId) {
    return {
      source: "provider_transaction_id",
      key: `provider_transaction:${input.accountId}:${input.providerTransactionId}`
    };
  }

  if (input.entryReference) {
    return {
      source: "entry_reference",
      key: `entry_reference:${input.accountId}:${input.entryReference}`
    };
  }

  if (input.endToEndId && !isMeaninglessIdentifier(input.endToEndId)) {
    return {
      source: "end_to_end_id",
      key: `end_to_end:${input.accountId}:${input.endToEndId}`
    };
  }

  return {
    source: "deduplication_fingerprint",
    key: `fingerprint:${input.accountId}:${input.deduplicationFingerprint}`
  };
}

export function getDeduplicationFingerprint(input: {
  accountId: string;
  bookingDate: string | null;
  valueDate: string | null;
  amount: string;
  currency: string;
  description: string | null;
  counterpartyName: string | null;
  merchantName: string | null;
  counterpartyAccountLast4: string | null;
  bankTransactionCode: string | null;
  merchantCategoryCode: string | null;
}): string {
  return createHash("sha256")
    .update(
      [
        input.accountId,
        input.bookingDate ?? "",
        input.valueDate ?? "",
        normalizeText(input.amount),
        input.currency,
        normalizeText(input.description),
        normalizeText(input.counterpartyName),
        normalizeText(input.merchantName),
        input.counterpartyAccountLast4 ?? "",
        normalizeText(input.bankTransactionCode),
        normalizeText(input.merchantCategoryCode)
      ].join("|")
    )
    .digest("hex");
}

function isMeaninglessIdentifier(value: string): boolean {
  const normalized = normalizeText(value).replace(/[^A-Za-z0-9]/g, "");

  return normalized.length === 0 || /^0+$/.test(normalized);
}
