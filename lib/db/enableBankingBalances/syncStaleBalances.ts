import "server-only";

import type { BankConnectionSummary } from "@/definitions";

import { getErrorMessage } from "../shared/getErrorMessage";
import { BALANCE_AUTO_REFRESH_MS } from "./constants";
import { shouldRefreshConnection } from "./refreshCheck";
import { syncEnableBankingConnectionBalances } from "./syncConnectionBalances";
import { BalanceSyncUnavailableError } from "./syncError";

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
  let rateLimitedConnectionCount = 0;
  let cooldownConnectionCount = 0;
  let cooldownUntil: string | null = null;

  for (const bankConnectionId of staleConnectionIds) {
    try {
      const connectionResult = await syncEnableBankingConnectionBalances({
        userId,
        bankConnectionId
      });

      if (connectionResult.status === "rate-limited") {
        cooldownConnectionCount += 1;
        cooldownUntil = getLatestTimestamp(
          cooldownUntil,
          connectionResult.cooldownUntil
        );
        continue;
      }

      if (connectionResult.status === "skipped") {
        continue;
      }

      synced = true;
      succeededConnectionCount += 1;
    } catch (error) {
      failedConnectionCount += 1;
      if (error instanceof BalanceSyncUnavailableError && error.rateLimited) {
        rateLimitedConnectionCount += 1;
      }
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
    failedConnectionCount,
    rateLimitedConnectionCount,
    cooldownConnectionCount,
    cooldownUntil
  };
}

function getLatestTimestamp(left: string | null, right: string): string {
  if (!left) {
    return right;
  }

  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}
