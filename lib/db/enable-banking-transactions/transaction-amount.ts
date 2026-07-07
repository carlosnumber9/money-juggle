import type { EnableBankingTransactionResource } from "@/definitions";

import { getTextValue, normalizeText } from "./text-values";

export function getTransactionAmount(
  transaction: EnableBankingTransactionResource
): { amount: string; currency: string } | null {
  const value = transaction.transaction_amount ?? transaction.amount;
  const rawAmount = getTextValue(value?.amount);
  const currency = getTextValue(value?.currency)?.toUpperCase();

  if (!rawAmount || !currency || !/^[A-Z]{3}$/.test(currency)) {
    return null;
  }

  return {
    amount: applyCreditDebitSign(rawAmount, transaction.credit_debit_indicator),
    currency
  };
}

function applyCreditDebitSign(amount: string, indicator: unknown) {
  const normalized = amount.trim();
  const absolute = normalized.replace(/^[+-]/, "");
  const normalizedIndicator = normalizeText(indicator).toUpperCase();

  if (normalizedIndicator.includes("DBIT") || normalizedIndicator === "DEBIT") {
    return `-${absolute}`;
  }

  if (
    normalizedIndicator.includes("CRDT") ||
    normalizedIndicator === "CREDIT"
  ) {
    return absolute;
  }

  return normalized;
}
