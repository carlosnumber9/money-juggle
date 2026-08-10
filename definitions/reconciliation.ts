import type {
  MonthlyTransactionCategory,
  TransactionLabelSummary
} from "./dataSource";

export type TransactionReconciliationKind =
  "debt" | "reimbursement" | "refund" | "other";

export type TransactionReconciliationDifferenceTreatment =
  "none" | "neutralized" | "reportable";

export type TransactionReconciliationCandidate = {
  id: string;
  accountId: string;
  accountName: string;
  accountIbanLast4: string | null;
  institutionName: string;
  institutionProviderId: string | null;
  bookingStatus: "booked" | "pending" | "information";
  bookingDate: string | null;
  reportingDate: string | null;
  amount: string;
  currency: string;
  description: string | null;
  merchantName: string | null;
  counterpartyName: string | null;
  counterpartyAccountLast4: string | null;
  category: MonthlyTransactionCategory | null;
  labels: TransactionLabelSummary[];
  isExistingMember: boolean;
  isInternalTransfer: boolean;
};

export type TransactionReconciliationCandidateCursor = {
  reportingDate: string;
  id: string;
};

export type TransactionReconciliationCandidatePage = {
  rows: TransactionReconciliationCandidate[];
  nextCursor: TransactionReconciliationCandidateCursor | null;
};

export type TransactionReconciliationDetail = {
  id: string;
  kind: TransactionReconciliationKind;
  note: string | null;
  currency: string;
  differenceTreatment: TransactionReconciliationDifferenceTreatment;
  adjustmentCategoryId: string | null;
  adjustmentCategory: MonthlyTransactionCategory | null;
  adjustmentReportingDate: string | null;
  adjustmentLabels: TransactionLabelSummary[];
  members: TransactionReconciliationCandidate[];
  currentBalance: string;
  requiresReview: boolean;
};

type ReconciliationDifferenceInput =
  | { treatment: "none" }
  | { treatment: "neutralized" }
  | {
      treatment: "reportable";
      categoryId: string;
      reportingDate: string;
      labelIds: string[];
      newLabelNames: string[];
    };

export type SaveTransactionReconciliationInput = {
  reconciliationId: string | null;
  sourceTransactionId: string | null;
  kind: TransactionReconciliationKind;
  note: string | null;
  transactionIds: string[];
  expectedBalance: string;
  difference: ReconciliationDifferenceInput;
};

export type SaveTransactionReconciliationResult = {
  reconciliationId: string;
  currentBalance: string;
};
