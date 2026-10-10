import "server-only";
import { expireConnectionConsent } from "../enableBankingSync/invalidSession";
import { isTransactionRetryDeferred } from "./retry";

import type {
  BankProgressReason,
  BankSyncReporter,
  EnableBankingPsuHeaders,
  ProgressStatus
} from "@/definitions";
import { getErrorMessage } from "../shared/getErrorMessage";
import { getActiveRateLimitCooldown } from "../enableBankingSync/rateLimitCooldown";
import {
  shouldRefreshConnectionTransactions,
  TRANSACTION_AUTO_REFRESH_MS
} from "./freshness";
import { listCompletedTransactionBackfillConnectionIds } from "./listCompletedBackfills";
import { listConnectionsForTransactionSync } from "./listConnections";
import { syncConnectionTransactions } from "./syncConnectionTransactions";
import type { TransactionSyncMode, TransactionSyncResult } from "./types";

export async function syncEnableBankingTransactions({
  userId,
  dateFrom,
  dateTo,
  mode,
  bankConnectionIds,
  force = false,
  maxAgeMs = TRANSACTION_AUTO_REFRESH_MS,
  psuHeadersByConnectionId,
  onProgress
}: {
  userId: string;
  dateFrom: string;
  dateTo: string;
  mode: TransactionSyncMode;
  bankConnectionIds?: ReadonlySet<string>;
  force?: boolean;
  onProgress?: BankSyncReporter;
  maxAgeMs?: number;
  psuHeadersByConnectionId?: ReadonlyMap<string, EnableBankingPsuHeaders>;
}): Promise<TransactionSyncResult> {
  const connections = await listConnectionsForTransactionSync(userId);
  const completedBackfillConnectionIds =
    mode === "backfill"
      ? await listCompletedTransactionBackfillConnectionIds(userId)
      : new Set<string>();
  const result: TransactionSyncResult = {
    synced: false,
    attemptedAccountCount: 0,
    succeededAccountCount: 0,
    partialAccountCount: 0,
    deferredAccountCount: 0,
    issues: [],
    completedConnectionIds: [],
    failedAccountCount: 0,
    rateLimitedAccountCount: 0,
    cooldownConnectionCount: 0,
    cooldownUntil: null,
    freshConnectionCount: 0
  };

  for (const connection of connections) {
    const update = (status: ProgressStatus, reason?: BankProgressReason) =>
      onProgress?.({
        bankConnectionId: connection.id,
        resource: "transactions",
        status,
        reason
      });
    if (
      !shouldSyncConnection(connection) ||
      (bankConnectionIds && !bankConnectionIds.has(connection.id)) ||
      completedBackfillConnectionIds.has(connection.id)
    ) {
      if (!bankConnectionIds || bankConnectionIds.has(connection.id))
        update(
          "warning",
          connection.status === "expired" ? "expired" : "unavailable"
        );
      continue;
    }

    update("running");
    if (
      await expireConnectionConsent({
        userId,
        bankConnectionId: connection.id,
        providerSessionId: connection.provider_session_id,
        consentExpiresAt: connection.consent_expires_at
      })
    ) {
      update("warning", "expired");
      continue;
    }

    const cooldownUntil = getActiveRateLimitCooldown(
      connection.provider_rate_limited_until
    );

    if (cooldownUntil) {
      update("warning", "deferred");
      result.cooldownConnectionCount += 1;
      result.deferredAccountCount += connection.accounts.length;
      result.issues.push({
        bankConnectionId: connection.id,
        resource: "transactions",
        kind: "deferred",
        retryAt: cooldownUntil
      });
      result.cooldownUntil = getLatestTimestamp(
        result.cooldownUntil,
        cooldownUntil
      );
      continue;
    }

    if (isTransactionRetryDeferred(connection.transaction_retry_after)) {
      update("warning", "deferred");
      result.deferredAccountCount += connection.accounts.length;
      result.issues.push({
        bankConnectionId: connection.id,
        resource: "transactions",
        kind: "deferred",
        retryAt: connection.transaction_retry_after ?? null
      });
      continue;
    }

    if (
      mode === "incremental" &&
      !force &&
      !connection.transaction_sync_incomplete &&
      !shouldRefreshConnectionTransactions({ connection, maxAgeMs })
    ) {
      update("skipped", "fresh");
      result.freshConnectionCount += 1;
      continue;
    }

    try {
      const connectionResult = await syncConnectionTransactions({
        userId,
        connection,
        dateFrom,
        dateTo,
        mode,
        psuHeaders: psuHeadersByConnectionId?.get(connection.id),
        onPersist: onProgress
          ? () => update("running", "persisting")
          : undefined
      });

      const failed = connectionResult.failedAccountCount > 0;
      const partial = connectionResult.partialAccountCount > 0;
      const allFailed =
        failed && connectionResult.succeededAccountCount === 0 && !partial;
      update(
        allFailed ? "error" : failed || partial ? "warning" : "completed",
        allFailed ? "failure" : failed || partial ? "partial" : undefined
      );
      mergeSyncResult(result, connectionResult);
    } catch (error) {
      update("error", "failure");
      result.attemptedAccountCount += connection.accounts.length;
      result.failedAccountCount += connection.accounts.length;
      result.issues.push({
        bankConnectionId: connection.id,
        resource: "transactions",
        kind: "error",
        retryAt: null
      });
      console.error("Enable Banking transaction sync failed", {
        bank_connection_id: connection.id,
        mode,
        message: getErrorMessage(error)
      });
    }
  }

  return result;
}

function shouldSyncConnection(
  connection: Awaited<
    ReturnType<typeof listConnectionsForTransactionSync>
  >[number]
) {
  return (
    connection.status === "linked" &&
    Boolean(connection.provider_session_id) &&
    connection.accounts.length > 0
  );
}

function mergeSyncResult(
  target: TransactionSyncResult,
  source: TransactionSyncResult
) {
  target.synced = target.synced || source.synced;
  target.attemptedAccountCount += source.attemptedAccountCount;
  target.succeededAccountCount += source.succeededAccountCount;
  target.partialAccountCount += source.partialAccountCount;
  target.deferredAccountCount += source.deferredAccountCount;
  target.issues.push(...source.issues);
  target.completedConnectionIds.push(...source.completedConnectionIds);
  target.failedAccountCount += source.failedAccountCount;
  target.rateLimitedAccountCount += source.rateLimitedAccountCount;
  target.cooldownConnectionCount += source.cooldownConnectionCount;
  target.cooldownUntil = getLatestTimestamp(
    target.cooldownUntil,
    source.cooldownUntil
  );
  target.freshConnectionCount += source.freshConnectionCount;
}

function getLatestTimestamp(
  left: string | null,
  right: string | null
): string | null {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}
