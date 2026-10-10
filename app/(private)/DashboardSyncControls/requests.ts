import type { DashboardProgressEvent, SyncResponse } from "@/definitions";
import { readDashboardStream } from "./stream";

export class SyncRequestError extends Error {
  constructor(public readonly status: number) {
    super("Could not synchronize bank data.");
  }
}

export async function requestSync(
  path: string,
  signal?: AbortSignal,
  onProgress?: (event: DashboardProgressEvent) => void
): Promise<SyncResponse> {
  const response = await fetch(path, {
    method: "POST",
    signal,
    headers: onProgress ? { Accept: "text/event-stream" } : undefined
  });
  if (
    onProgress &&
    response.ok &&
    response.headers.get("content-type")?.includes("text/event-stream")
  )
    return readDashboardStream(response, onProgress);
  const result = await response.json();
  if (
    (!response.ok && !(response.status === 500 || response.status === 429)) ||
    (!response.ok && typeof result.hasErrors !== "boolean")
  )
    throw new SyncRequestError(response.status);
  return {
    hasErrors: Boolean(result.hasErrors),
    incomplete:
      typeof result.incomplete === "boolean"
        ? result.incomplete
        : Boolean(result.partialFailure),
    retryPending: Boolean(result.retryPending ?? result.rateLimited),
    feedback: Array.isArray(result.feedback) ? result.feedback : [],
    syncInProgress: Boolean(result.syncInProgress),
    completedTransactionBanks: Array.isArray(result.completedTransactionBanks)
      ? result.completedTransactionBanks
      : []
  };
}
