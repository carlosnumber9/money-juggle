import type { BankConnectionSummary } from "@/definitions";

import { STALE_LINKING_AFTER_MS } from "./constants";

export function isStaleLinkingConnection(
  connection: BankConnectionSummary
): boolean {
  const lastChangedAt = new Date(connection.updated_at).getTime();

  return (
    Number.isFinite(lastChangedAt) &&
    Date.now() - lastChangedAt > STALE_LINKING_AFTER_MS
  );
}
