import type { EnableBankingTransactionResource } from "@/definitions";

import { getDate } from "./date-values";
import {
  getDeduplicationFingerprint,
  getStableIdentity
} from "./transaction-identity";

export function getRowIdentity(input: {
  accountId: string;
  transaction: EnableBankingTransactionResource;
  amount: { amount: string; currency: string };
  description: string | null;
  counterpartyName: string | null;
  merchantName: string | null;
  counterpartyAccountLast4: string | null;
  bankTransactionCode: string | null;
  merchantCategoryCode: string | null;
  providerInternalTransactionId: string | null;
  providerTransactionId: string | null;
  entryReference: string | null;
  endToEndId: string | null;
}) {
  const fingerprint = getDeduplicationFingerprint({
    accountId: input.accountId,
    bookingDate: getDate(input.transaction.booking_date),
    valueDate: getDate(input.transaction.value_date),
    amount: input.amount.amount,
    currency: input.amount.currency,
    description: input.description,
    counterpartyName: input.counterpartyName,
    merchantName: input.merchantName,
    counterpartyAccountLast4: input.counterpartyAccountLast4,
    bankTransactionCode: input.bankTransactionCode,
    merchantCategoryCode: input.merchantCategoryCode
  });

  return {
    ...getStableIdentity({
      accountId: input.accountId,
      providerInternalTransactionId: input.providerInternalTransactionId,
      providerTransactionId: input.providerTransactionId,
      entryReference: input.entryReference,
      endToEndId: input.endToEndId,
      deduplicationFingerprint: fingerprint
    }),
    fingerprint
  };
}
