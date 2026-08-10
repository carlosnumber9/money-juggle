import type {
  SaveTransactionReconciliationInput,
  TransactionReconciliationKind
} from "@/definitions";

import { parseDecimal } from "./decimal";
import { isValidTransactionLabelName } from "./labels";
import { isValidReportingDate } from "./transactionDates";

export const RECONCILIATION_KINDS = [
  "debt",
  "reimbursement",
  "refund",
  "other"
] as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isTransactionReconciliationKind(
  value: string
): value is TransactionReconciliationKind {
  return RECONCILIATION_KINDS.includes(value as TransactionReconciliationKind);
}

export function isValidSaveTransactionReconciliationInput(
  input: SaveTransactionReconciliationInput
): boolean {
  const distinctTransactionIds = new Set(input.transactionIds);

  if (
    (input.reconciliationId !== null &&
      !UUID_PATTERN.test(input.reconciliationId)) ||
    (input.sourceTransactionId !== null &&
      !UUID_PATTERN.test(input.sourceTransactionId)) ||
    !isTransactionReconciliationKind(input.kind) ||
    input.transactionIds.length < 2 ||
    distinctTransactionIds.size !== input.transactionIds.length ||
    input.transactionIds.some((id) => !UUID_PATTERN.test(id)) ||
    (input.reconciliationId === null &&
      (!input.sourceTransactionId ||
        !distinctTransactionIds.has(input.sourceTransactionId))) ||
    (input.kind === "other" && !input.note?.trim())
  ) {
    return false;
  }

  let balance: bigint;

  try {
    balance = parseDecimal(input.expectedBalance);
  } catch {
    return false;
  }

  if (balance === 0n) {
    return input.difference.treatment === "none";
  }

  if (input.difference.treatment === "none") {
    return false;
  }

  if (input.difference.treatment === "neutralized") {
    return true;
  }

  return (
    UUID_PATTERN.test(input.difference.categoryId) &&
    isValidReportingDate(input.difference.reportingDate) &&
    input.difference.labelIds.every((id) => UUID_PATTERN.test(id)) &&
    new Set(input.difference.labelIds).size ===
      input.difference.labelIds.length &&
    input.difference.newLabelNames.every(isValidTransactionLabelName)
  );
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
