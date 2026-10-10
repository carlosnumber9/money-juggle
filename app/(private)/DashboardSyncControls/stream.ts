import type {
  DashboardProgressEvent,
  DashboardStreamEvent,
  SyncResponse
} from "@/definitions";

export async function readDashboardStream(
  response: Response,
  onProgress: (event: DashboardProgressEvent) => void
): Promise<SyncResponse> {
  if (!response.body) throw new Error("Missing synchronization stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, "\n");
      if (buffer.length > 1_000_000)
        throw new Error("Synchronization event is too large.");
      let separator: number;
      while ((separator = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        const data = frame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (!data) continue;
        const event = parseDashboardEvent(JSON.parse(data));
        if (event.type === "error")
          throw new Error("Could not synchronize bank data.");
        if (event.type === "result") return event.result;
        onProgress(event);
      }
      if (done)
        throw new Error("Synchronization stream ended without a result.");
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function parseDashboardEvent(value: unknown): DashboardStreamEvent {
  if (!value || typeof value !== "object")
    throw new Error("Invalid synchronization event.");
  const event = value as Record<string, unknown>;
  const validStatus = [
    "pending",
    "running",
    "completed",
    "skipped",
    "warning",
    "error"
  ].includes(String(event.status));
  const validResource =
    event.resource === "balances" || event.resource === "transactions";
  const validReason =
    event.reason === undefined ||
    [
      "fresh",
      "deferred",
      "expired",
      "unavailable",
      "busy",
      "partial",
      "failure",
      "persisting"
    ].includes(String(event.reason));
  if (
    event.type === "banks" &&
    Array.isArray(event.banks) &&
    event.banks.every(
      (bank) =>
        bank && typeof bank.id === "string" && typeof bank.name === "string"
    )
  )
    return value as DashboardStreamEvent;
  if (
    event.type === "phase" &&
    ["connections", "balances", "transactions"].includes(String(event.phase)) &&
    validStatus
  )
    return value as DashboardStreamEvent;
  if (
    event.type === "bank" &&
    typeof event.bankConnectionId === "string" &&
    validResource &&
    validStatus &&
    validReason
  )
    return value as DashboardStreamEvent;
  if (event.type === "error" && event.error === "dashboard-sync-failed")
    return value as DashboardStreamEvent;
  if (
    event.type === "result" &&
    [200, 429, 500].includes(Number(event.status))
  ) {
    const result = event.result as Partial<SyncResponse> | null;
    if (
      result &&
      typeof result.hasErrors === "boolean" &&
      typeof result.incomplete === "boolean" &&
      typeof result.retryPending === "boolean" &&
      Array.isArray(result.feedback)
    )
      return value as DashboardStreamEvent;
  }
  throw new Error("Invalid synchronization event.");
}
