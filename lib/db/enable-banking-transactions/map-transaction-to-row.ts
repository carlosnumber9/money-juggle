import { ENABLE_BANKING_PROVIDER } from "@/definitions";

import { getDate, getDateTime } from "./date-values";
import { getRowIdentity } from "./row-identity";
import { getTransactionAmount } from "./transaction-amount";
import {
  getBookingStatus,
  getCounterpartyAccountLast4,
  getCounterpartyName,
  getDescription
} from "./transaction-content";
import { getTextValue } from "./text-values";
import type { TransactionMapperInput, TransactionRow } from "./types";

export function mapTransactionToRow({
  userId,
  accountId,
  transaction
}: TransactionMapperInput): TransactionRow | null {
  const amount = getTransactionAmount(transaction);

  if (!amount) {
    return null;
  }

  const providerTransactionId =
    getTextValue(transaction.transaction_id) ??
    getTextValue(transaction.uid) ??
    null;
  const providerInternalTransactionId =
    getTextValue(transaction.internal_transaction_id) ?? null;
  const entryReference = getTextValue(transaction.entry_reference) ?? null;
  const endToEndId = getTextValue(transaction.end_to_end_id) ?? null;
  const description = getDescription(transaction);
  const counterpartyName = getCounterpartyName(transaction);
  const merchantName = getTextValue(transaction.merchant_name);
  const counterpartyAccountLast4 = getCounterpartyAccountLast4(transaction);
  const bankTransactionCode = getTextValue(transaction.bank_transaction_code);
  const merchantCategoryCode = getTextValue(transaction.merchant_category_code);
  const identity = getRowIdentity({
    accountId,
    transaction,
    amount,
    description,
    counterpartyName,
    merchantName,
    counterpartyAccountLast4,
    bankTransactionCode,
    merchantCategoryCode,
    providerInternalTransactionId,
    providerTransactionId,
    entryReference,
    endToEndId
  });

  return {
    user_id: userId,
    account_id: accountId,
    stable_import_key: identity.key,
    identity_source: identity.source,
    provider: ENABLE_BANKING_PROVIDER,
    provider_transaction_id: providerTransactionId,
    provider_internal_transaction_id: providerInternalTransactionId,
    entry_reference: entryReference,
    end_to_end_id: endToEndId,
    deduplication_fingerprint: identity.fingerprint,
    booking_status: getBookingStatus(transaction),
    booking_date: getDate(
      transaction.booking_date ?? transaction.booking_date_time
    ),
    booking_datetime: getDateTime(transaction.booking_date_time),
    value_date: getDate(transaction.value_date ?? transaction.value_date_time),
    value_datetime: getDateTime(transaction.value_date_time),
    amount: amount.amount,
    currency: amount.currency,
    description,
    merchant_name: merchantName,
    counterparty_name: counterpartyName,
    counterparty_account_last4: counterpartyAccountLast4,
    bank_transaction_code: bankTransactionCode,
    merchant_category_code: merchantCategoryCode
  };
}
