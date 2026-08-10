import type {
  MonthlyTransactionSummary,
  TransactionReconciliationAdjustment
} from "@/definitions";

import { isInternalTransfer } from "./internalTransfers";

export type ReportingMovement = {
  id: string;
  source: "transaction" | "reconciliation_adjustment";
  reconciliationId: string | null;
  reporting_date: string | null;
  amount: string;
  currency: string;
  category: MonthlyTransactionSummary["category"];
  labels: MonthlyTransactionSummary["labels"];
};

export type ExcludedReportingTransaction = {
  transaction: MonthlyTransactionSummary;
  reason: "internal_transfer" | "reconciliation";
};

export type ReportingMovementSet = {
  movements: ReportingMovement[];
  excludedTransactions: ExcludedReportingTransaction[];
};

export function buildReportingMovementSet({
  transactions,
  adjustments = []
}: {
  transactions: MonthlyTransactionSummary[];
  adjustments?: TransactionReconciliationAdjustment[];
}): ReportingMovementSet {
  const movements: ReportingMovement[] = [];
  const excludedTransactions: ExcludedReportingTransaction[] = [];

  for (const transaction of transactions) {
    const reason = getFinancialNeutralityReason(transaction);

    if (reason) {
      excludedTransactions.push({ transaction, reason });
      continue;
    }

    movements.push({
      id: transaction.id,
      source: "transaction",
      reconciliationId: null,
      reporting_date: transaction.reporting_date,
      amount: transaction.amount,
      currency: transaction.currency,
      category: transaction.category,
      labels: transaction.labels
    });
  }

  for (const adjustment of adjustments) {
    movements.push({
      id: `reconciliation:${adjustment.reconciliationId}`,
      source: "reconciliation_adjustment",
      reconciliationId: adjustment.reconciliationId,
      reporting_date: adjustment.reportingDate,
      amount: adjustment.amount,
      currency: adjustment.currency,
      category: adjustment.category,
      labels: adjustment.labels
    });
  }

  return { movements, excludedTransactions };
}

export function isFinanciallyNeutralTransaction(
  transaction: MonthlyTransactionSummary
): boolean {
  return getFinancialNeutralityReason(transaction) !== null;
}

function getFinancialNeutralityReason(
  transaction: MonthlyTransactionSummary
): ExcludedReportingTransaction["reason"] | null {
  if (isInternalTransfer(transaction)) {
    return "internal_transfer";
  }

  if (transaction.reconciliation) {
    return "reconciliation";
  }

  return null;
}
