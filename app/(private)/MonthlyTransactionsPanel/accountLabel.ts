import type { MonthlyTransactionSummary } from "@/definitions";

export function getAccountLabel(
  transaction: MonthlyTransactionSummary
): string {
  if (transaction.account_iban_last4) {
    return `${transaction.institution_name}, ${transaction.account_name}, terminada en ${transaction.account_iban_last4}`;
  }

  return `${transaction.institution_name}, ${transaction.account_name}`;
}
