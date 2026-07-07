import type { StoredConnectionForBalanceSync } from "./types";

export function getBalanceSyncSkipReason(
  connection: StoredConnectionForBalanceSync | null
): string {
  if (!connection) {
    return "connection-not-found";
  }

  if (connection.status !== "linked") {
    return "connection-not-linked";
  }

  if (!connection.provider_session_id) {
    return "missing-provider-session-id";
  }

  if (connection.accounts.length === 0) {
    return "no-accounts";
  }

  return "unknown";
}
