import type { EnableBankingTransactionResource } from "@/definitions";

export function appendTransactionPage(
  transactions: EnableBankingTransactionResource[],
  indices: Map<string, number>,
  page: EnableBankingTransactionResource[]
) {
  for (const transaction of page) {
    const identity = getTransactionPageIdentity(transaction);
    const previousIndex = identity ? indices.get(identity) : undefined;
    if (previousIndex !== undefined) {
      transactions[previousIndex] = transaction;
    } else {
      if (identity) indices.set(identity, transactions.length);
      transactions.push(transaction);
    }
  }
}

function getTransactionPageIdentity(
  transaction: EnableBankingTransactionResource
): string | null {
  for (const field of [
    "internal_transaction_id",
    "transaction_id",
    "uid",
    "entry_reference"
  ] as const) {
    const value = transaction[field];
    if (typeof value === "string" && value.trim()) return `${field}:${value}`;
  }
  return null;
}
