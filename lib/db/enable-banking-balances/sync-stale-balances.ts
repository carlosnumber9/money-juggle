import "server-only";

import type { BankConnectionSummary } from "@/definitions";

import { getErrorMessage } from "../shared/get-error-message";
import { BALANCE_AUTO_REFRESH_MS } from "./constants";
import { shouldRefreshConnection } from "./refresh-check";
import { syncEnableBankingConnectionBalances } from "./sync-connection-balances";

export async function syncStaleEnableBankingBalances({
  userId,
  connections,
  maxAgeMs = BALANCE_AUTO_REFRESH_MS
}: {
  userId: string;
  connections: BankConnectionSummary[];
  maxAgeMs?: number;
}): Promise<boolean> {
  const staleConnectionIds = connections
    .filter((connection) => shouldRefreshConnection(connection, maxAgeMs))
    .map((connection) => connection.id);

  console.info("Balance sync eligibility checked", {
    connection_count: connections.length,
    stale_connection_count: staleConnectionIds.length
  });

  let synced = false;

  for (const bankConnectionId of staleConnectionIds) {
    try {
      await syncEnableBankingConnectionBalances({ userId, bankConnectionId });
      synced = true;
    } catch (error) {
      console.error("Enable Banking balance sync failed", {
        bankConnectionId,
        message: getErrorMessage(error)
      });
    }
  }

  return synced;
}
