import type {
  MonthlyTransactionSummary,
  TransactionReconciliationCandidate
} from "@/definitions";
import { sumDecimals } from "@/lib/domain/decimal";

export function mapTransactionToReconciliationCandidate(
  transaction: MonthlyTransactionSummary
): TransactionReconciliationCandidate {
  return {
    id: transaction.id,
    accountId: transaction.account_id,
    accountName: transaction.account_name,
    accountIbanLast4: transaction.account_iban_last4,
    institutionName: transaction.institution_name,
    institutionProviderId: transaction.institution_provider_id,
    bookingStatus: transaction.booking_status,
    bookingDate: transaction.booking_date,
    reportingDate: transaction.reporting_date,
    amount: transaction.amount,
    currency: transaction.currency,
    description: transaction.description,
    merchantName: transaction.merchant_name,
    counterpartyName: transaction.counterparty_name,
    counterpartyAccountLast4: null,
    category: transaction.category,
    labels: transaction.labels,
    isExistingMember: false,
    isInternalTransfer: transaction.cashflow_type === "internal_transfer"
  };
}

export function calculateReconciliationBalance(
  transactions: TransactionReconciliationCandidate[]
): string {
  return sumDecimals(transactions.map((transaction) => transaction.amount));
}

export function getDefaultAdjustmentDate(
  transactions: TransactionReconciliationCandidate[]
): string {
  return (
    transactions
      .map((transaction) => transaction.reportingDate)
      .filter((date): date is string => Boolean(date))
      .sort()
      .at(-1) ?? new Date().toISOString().slice(0, 10)
  );
}

export function mergeCandidateRows(
  current: TransactionReconciliationCandidate[],
  incoming: TransactionReconciliationCandidate[]
): TransactionReconciliationCandidate[] {
  return [
    ...new Map(
      [...current, ...incoming].map((transaction) => [
        transaction.id,
        transaction
      ])
    ).values()
  ];
}
