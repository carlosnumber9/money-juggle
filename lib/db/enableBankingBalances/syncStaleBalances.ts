import "server-only";

import type {
  BankSyncReporter,
  BankConnectionSummary,
  EnableBankingPsuHeaders,
  ConnectionSyncIssue
} from "@/definitions";

import { getErrorMessage } from "../shared/getErrorMessage";
import { BALANCE_AUTO_REFRESH_MS } from "./constants";
import { shouldRefreshConnection } from "./refreshCheck";
import { syncEnableBankingConnectionBalances } from "./syncConnectionBalances";
import { BalanceSyncUnavailableError } from "./syncError";

export async function syncStaleEnableBankingBalances({
  userId,
  connections,
  maxAgeMs = BALANCE_AUTO_REFRESH_MS,
  force = false,
  psuHeadersByConnectionId,
  onProgress
}: {
  userId: string;
  connections: BankConnectionSummary[];
  onProgress?: BankSyncReporter;
  maxAgeMs?: number;
  force?: boolean;
  psuHeadersByConnectionId?: ReadonlyMap<string, EnableBankingPsuHeaders>;
}) {
  const staleConnectionIds = connections
    .filter((connection) =>
      force
        ? connection.status === "linked" && connection.accounts.length > 0
        : shouldRefreshConnection(connection, maxAgeMs)
    )
    .map((connection) => connection.id);

  for (const connection of connections) {
    if (!staleConnectionIds.includes(connection.id))
      onProgress?.({
        bankConnectionId: connection.id,
        resource: "balances",
        status: "skipped",
        reason: "fresh"
      });
  }

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
  let partialConnectionCount = 0;
  const issues: ConnectionSyncIssue[] = [];

  for (const bankConnectionId of staleConnectionIds) {
    onProgress?.({ bankConnectionId, resource: "balances", status: "running" });
    try {
      const connectionResult = await syncEnableBankingConnectionBalances({
        userId,
        bankConnectionId,
        psuHeaders: psuHeadersByConnectionId?.get(bankConnectionId),
        onPersist: onProgress
          ? () =>
              onProgress({
                bankConnectionId,
                resource: "balances",
                status: "running",
                reason: "persisting"
              })
          : undefined
      });

      if (connectionResult.status === "rate-limited") {
        onProgress?.({
          bankConnectionId,
          resource: "balances",
          status: "warning",
          reason: "deferred"
        });
        issues.push({
          bankConnectionId,
          resource: "balances",
          kind: "deferred",
          retryAt: connectionResult.cooldownUntil
        });
        cooldownConnectionCount += 1;
        cooldownUntil = getLatestTimestamp(
          cooldownUntil,
          connectionResult.cooldownUntil
        );
        continue;
      }

      if (connectionResult.status === "skipped") {
        onProgress?.({
          bankConnectionId,
          resource: "balances",
          status: "warning",
          reason: connectionResult.skipReason ?? "unavailable"
        });
        continue;
      }

      onProgress?.({
        bankConnectionId,
        resource: "balances",
        status: connectionResult.partialFailure ? "warning" : "completed",
        reason: connectionResult.partialFailure ? "partial" : undefined
      });
      synced = true;
      succeededConnectionCount += 1;
      if (connectionResult.partialFailure) {
        partialConnectionCount += 1;
        issues.push({
          bankConnectionId,
          resource: "balances",
          kind: "error",
          retryAt: null
        });
      }
    } catch (error) {
      onProgress?.({
        bankConnectionId,
        resource: "balances",
        status: "error",
        reason: "failure"
      });
      failedConnectionCount += 1;
      issues.push({
        bankConnectionId,
        resource: "balances",
        kind: "error",
        retryAt: null
      });
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
    cooldownUntil,
    partialConnectionCount,
    issues
  };
}

function getLatestTimestamp(left: string | null, right: string): string {
  if (!left) {
    return right;
  }

  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}
