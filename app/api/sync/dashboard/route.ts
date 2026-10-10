import type { NextRequest } from "next/server";
import { after, NextResponse } from "next/server";

import type { BankSyncProgress, DashboardProgressEvent } from "@/definitions";
import { createDashboardProgressStream } from "@/lib/db/enableBankingSync/progressStream";

import { isEmailAllowed } from "@/lib/auth/allowlist";
import { syncStaleEnableBankingBalances } from "@/lib/db/enableBankingBalances";
import { listUserEnableBankingConnections } from "@/lib/db/enableBankingConnections";
import { syncEnableBankingTransactions } from "@/lib/db/enableBankingTransactions";
import { withConnectionSyncLeases } from "@/lib/db/enableBankingSync/connectionLease";
import { getInteractivePsuHeadersByConnection } from "@/lib/db/enableBankingSync/interactivePsuHeaders";
import { getIncrementalProviderDateRange } from "@/lib/domain/transactionRanges";
import { getCurrentSupabaseUser } from "@/lib/supabase/currentUser";

import { getDashboardSyncResult } from "./result";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentSupabaseUser();

  if (!user) {
    return NextResponse.json({ error: "login-required" }, { status: 401 });
  }

  if (!isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "not-allowed" }, { status: 403 });
  }

  if (request.headers.get("accept")?.includes("text/event-stream")) {
    const { response, finished } = createDashboardProgressStream((report) =>
      runDashboardSync(request, user.id, report)
    );
    after(finished);
    return response;
  }
  try {
    const result = await runDashboardSync(request, user.id);
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json(
      { error: "dashboard-sync-failed" },
      { status: 500 }
    );
  }
}

async function runDashboardSync(
  request: NextRequest,
  userId: string,
  report?: (event: DashboardProgressEvent) => void
) {
  const progressByResource = {
    balances: new Map<string, BankSyncProgress>(),
    transactions: new Map<string, BankSyncProgress>()
  };
  const reportBank = (progress: BankSyncProgress) => {
    progressByResource[progress.resource].set(
      progress.bankConnectionId,
      progress
    );
    report?.({ type: "bank", ...progress });
  };
  try {
    report?.({ type: "phase", phase: "connections", status: "running" });
    const force = request.nextUrl.searchParams.get("force") === "true";
    const connections = await listUserEnableBankingConnections(userId, {
      useServiceRole: true
    });
    const linkedConnections = connections.filter(
      (connection) =>
        connection.status === "linked" && connection.accounts.length > 0
    );
    report?.({
      type: "banks",
      banks: linkedConnections.map((connection) => ({
        id: connection.id,
        name: connection.institution?.name ?? "Banco"
      }))
    });
    const range = getIncrementalProviderDateRange();
    const leaseResult = await withConnectionSyncLeases({
      userId,
      bankConnectionIds: linkedConnections.map((connection) => connection.id),
      run: async (acquiredConnectionIds) => {
        for (const connection of linkedConnections) {
          if (!acquiredConnectionIds.has(connection.id)) {
            for (const resource of ["balances", "transactions"] as const)
              reportBank({
                bankConnectionId: connection.id,
                resource,
                status: "warning",
                reason: "busy"
              });
          }
        }
        const psuHeadersByConnectionId =
          await getInteractivePsuHeadersByConnection({
            userId,
            bankConnectionIds: acquiredConnectionIds,
            requestHeaders: request.headers
          });
        report?.({ type: "phase", phase: "connections", status: "completed" });
        report?.({ type: "phase", phase: "balances", status: "running" });
        const balances = await syncStaleEnableBankingBalances({
          userId,
          connections: linkedConnections.filter((connection) =>
            acquiredConnectionIds.has(connection.id)
          ),
          force,
          psuHeadersByConnectionId,
          onProgress: report ? reportBank : undefined
        });
        report?.({ type: "phase", phase: "balances", status: "completed" });
        report?.({ type: "phase", phase: "transactions", status: "running" });
        const transactions = await syncEnableBankingTransactions({
          userId,
          dateFrom: range.from,
          dateTo: range.to,
          mode: "incremental",
          bankConnectionIds: acquiredConnectionIds,
          force,
          psuHeadersByConnectionId,
          onProgress: report ? reportBank : undefined
        });

        if (
          report &&
          linkedConnections.some(
            (connection) => !progressByResource.transactions.has(connection.id)
          )
        ) {
          const latest = await listUserEnableBankingConnections(userId, {
            useServiceRole: true
          });
          for (const connection of linkedConnections) {
            if (progressByResource.transactions.has(connection.id)) continue;
            const status = latest.find(
              (candidate) => candidate.id === connection.id
            )?.status;
            reportBank({
              bankConnectionId: connection.id,
              resource: "transactions",
              status: "warning",
              reason:
                status === "expired" || status === "error"
                  ? "expired"
                  : "unavailable"
            });
          }
        }
        report?.({ type: "phase", phase: "transactions", status: "completed" });
        return { balances, transactions };
      }
    });
    const { balances, transactions } = leaseResult.value;
    const result = getDashboardSyncResult({
      balances,
      transactions,
      connections
    });

    console.info("Dashboard sync completed", {
      user_id_suffix: userId.slice(-8),
      force,
      balance_succeeded_connection_count: balances.succeededConnectionCount,
      balance_failed_connection_count: balances.failedConnectionCount,
      transaction_succeeded_account_count: transactions.succeededAccountCount,
      transaction_partial_account_count: transactions.partialAccountCount,
      transaction_deferred_account_count: transactions.deferredAccountCount,
      balance_partial_connection_count: balances.partialConnectionCount,
      has_errors: result.body.hasErrors,
      incomplete: result.body.incomplete,
      retry_pending: result.body.retryPending,
      transaction_failed_account_count: transactions.failedAccountCount,
      transaction_fresh_connection_count: transactions.freshConnectionCount,
      rate_limited: result.body.rateLimited,
      cooldown_until: result.body.cooldownUntil,
      acquired_connection_count: leaseResult.acquiredConnectionCount,
      busy_connection_count: leaseResult.busyConnectionCount
    });

    return {
      status: result.status,
      body: {
        ...result.body,
        syncInProgress: leaseResult.busyConnectionCount > 0
      }
    };
  } catch (error) {
    console.error("Dashboard sync failed", {
      message: error instanceof Error ? error.message : "Unknown error."
    });

    throw error;
  }
}
