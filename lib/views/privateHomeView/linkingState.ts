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
  connection: Pick<BankConnectionSummary, "created_at">
): string | null {
  const linkingStartedAt = new Date(connection.created_at).getTime();

  return Number.isFinite(linkingStartedAt)
    ? new Date(linkingStartedAt + STALE_LINKING_AFTER_MS).toISOString()
    : null;
}
