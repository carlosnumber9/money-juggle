import type { SyncResponse, SyncResource } from "./sync";

export type ProgressStatus =
  "pending" | "running" | "completed" | "skipped" | "warning" | "error";
export type ProgressRow = {
  id: string;
  label: string;
  status: ProgressStatus;
  detail?: string;
  children?: ProgressRow[];
};
export type InitialLoadPhase = "session" | "data" | "prepared";
export type InitialLoadReporter = (
  phase: InitialLoadPhase,
  status: ProgressStatus
) => void;
export type BankProgressReason =
  | "fresh"
  | "deferred"
  | "expired"
  | "unavailable"
  | "busy"
  | "partial"
  | "failure"
  | "persisting";
export type BankSyncProgress = {
  bankConnectionId: string;
  resource: SyncResource;
  status: ProgressStatus;
  reason?: BankProgressReason;
};
export type BankSyncReporter = (progress: BankSyncProgress) => void;
export type DashboardProgressEvent =
  | { type: "banks"; banks: { id: string; name: string }[] }
  | {
      type: "phase";
      phase: "connections" | SyncResource;
      status: ProgressStatus;
    }
  | ({ type: "bank" } & BankSyncProgress);
export type DashboardStreamEvent =
  | DashboardProgressEvent
  | { type: "result"; status: number; result: SyncResponse }
  | { type: "error"; error: "dashboard-sync-failed" };
