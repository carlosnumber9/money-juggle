import type { BankConnectionSummary } from "@/definitions";

import { STALE_LINKING_AFTER_MS } from "./constants";

export function isStaleLinkingConnection(
  connection: BankConnectionSummary,
  now = Date.now()
): boolean {
  const staleAt = getLinkingStaleAt(connection);

  return staleAt !== null && now >= Date.parse(staleAt);
}

export function getLinkingStaleAt(
  connection: Pick<BankConnectionSummary, "updated_at">
): string | null {
  const lastChangedAt = new Date(connection.updated_at).getTime();

  return Number.isFinite(lastChangedAt)
    ? new Date(lastChangedAt + STALE_LINKING_AFTER_MS).toISOString()
    : null;
}
