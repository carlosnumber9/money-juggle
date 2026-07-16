import "server-only";

import type { BankConnectionSummary } from "@/definitions";

import { getErrorMessage } from "../shared/getErrorMessage";
import { BALANCE_AUTO_REFRESH_MS } from "./constants";
import { shouldRefreshConnection } from "./refreshCheck";
import { syncEnableBankingConnectionBalances } from "./syncConnectionBalances";

export async function syncStaleEnableBankingBalances({
  userId,
  connections,
  maxAgeMs = BALANCE_AUTO_REFRESH_MS,
  force = false
}: {
  userId: string;
  connections: BankConnectionSummary[];
  maxAgeMs?: number;
  force?: boolean;
}) {
  const staleConnectionIds = connections
    .filter((connection) =>
      force
        ? connection.status === "linked" && connection.accounts.length > 0
        : shouldRefreshConnection(connection, maxAgeMs)
    )
    .map((connection) => connection.id);

  console.info("Balance sync eligibility checked", {
    connection_count: connections.length,
    eligible_connection_count: staleConnectionIds.length,
    force
  });

  let synced = false;
  let succeededConnectionCount = 0;
  let failedConnectionCount = 0;

  for (const bankConnectionId of staleConnectionIds) {
    try {
      await syncEnableBankingConnectionBalances({ userId, bankConnectionId });
      synced = true;
      succeededConnectionCount += 1;
    } catch (error) {
      failedConnectionCount += 1;
      console.error("Enable Banking balance sync failed", {
        bankConnectionId,
        message: getErrorMessage(error)
      });
    }
  }

  return {
    synced,
    attemptedConnectionCount: staleConnectionIds.length,
    succeededConnectionCount,
    failedConnectionCount
  };
}
