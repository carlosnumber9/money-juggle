export type SyncIssueKind = "error" | "partial" | "deferred";
export type SyncResource = "balances" | "transactions";

export type ConnectionSyncIssue = {
  bankConnectionId: string;
  resource: SyncResource;
  kind: SyncIssueKind;
  retryAt: string | null;
};

export type SyncFeedback = Omit<ConnectionSyncIssue, "bankConnectionId"> & {
  bankName: string;
};

export type SyncResponse = {
  hasErrors: boolean;
  incomplete: boolean;
  retryPending: boolean;
  feedback: SyncFeedback[];
  syncInProgress?: boolean;
  completedTransactionBanks?: string[];
};
