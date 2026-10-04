import type { SyncResponse } from "@/definitions";

export async function requestSync(
  path: string,
  signal?: AbortSignal
): Promise<SyncResponse> {
  const response = await fetch(path, { method: "POST", signal });
  const result = await response.json();
  if (
    (!response.ok && !(response.status === 500 || response.status === 429)) ||
    (!response.ok && typeof result.hasErrors !== "boolean")
  )
    throw new Error("Could not synchronize bank data.");
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
