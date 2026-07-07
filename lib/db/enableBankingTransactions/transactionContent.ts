import type { EnableBankingTransactionResource } from "@/definitions";

import { getLast4 } from "./dateValues";
import { getTextValue, normalizeText } from "./textValues";

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
  transaction: EnableBankingTransactionResource
): string | null {
  return (
    getLast4(transaction.creditor_account?.iban) ??
    getLast4(transaction.debtor_account?.iban) ??
    getLast4(transaction.creditor_account?.other?.identification) ??
    getLast4(transaction.debtor_account?.other?.identification)
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
