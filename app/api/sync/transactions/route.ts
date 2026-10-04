import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isEmailAllowed } from "@/lib/auth/allowlist";
import {
  listConnectionsForTransactionSync,
  syncEnableBankingTransactions
} from "@/lib/db/enableBankingTransactions";
import { withConnectionSyncLeases } from "@/lib/db/enableBankingSync/connectionLease";
import { getInteractivePsuHeadersByConnection } from "@/lib/db/enableBankingSync/interactivePsuHeaders";
import { getIncrementalProviderDateRange } from "@/lib/domain/transactionRanges";
import { getCurrentSupabaseUser } from "@/lib/supabase/currentUser";

import { getTransactionSyncResult } from "./result";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentSupabaseUser();

  if (!user) {
    return NextResponse.json({ error: "login-required" }, { status: 401 });
  }

  if (!isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "not-allowed" }, { status: 403 });
  }

  try {
    const range = getIncrementalProviderDateRange();
    const force = request.nextUrl.searchParams.get("force") === "true";
    const connections = await listConnectionsForTransactionSync(user.id);
    const leaseResult = await withConnectionSyncLeases({
      userId: user.id,
      bankConnectionIds: connections.map((connection) => connection.id),
      run: async (acquiredConnectionIds) => {
        const psuHeadersByConnectionId =
          await getInteractivePsuHeadersByConnection({
            userId: user.id,
            bankConnectionIds: acquiredConnectionIds,
            requestHeaders: request.headers
          });

        return syncEnableBankingTransactions({
          userId: user.id,
          dateFrom: range.from,
          dateTo: range.to,
          mode: "incremental",
          bankConnectionIds: acquiredConnectionIds,
          force,
          psuHeadersByConnectionId
        });
      }
    });
    const result = leaseResult.value;

    console.info("Transaction sync completed", {
      user_id_suffix: user.id.slice(-8),
      date_from: range.from,
      date_to: range.to,
      mode: "incremental",
      force,
      synced: result.synced,
      attempted_account_count: result.attemptedAccountCount,
      succeeded_account_count: result.succeededAccountCount,
      partial_account_count: result.partialAccountCount,
      deferred_account_count: result.deferredAccountCount,
      failed_account_count: result.failedAccountCount,
      rate_limited_account_count: result.rateLimitedAccountCount,
      cooldown_connection_count: result.cooldownConnectionCount,
      cooldown_until: result.cooldownUntil,
      fresh_connection_count: result.freshConnectionCount,
      busy_connection_count: leaseResult.busyConnectionCount
    });

    const response = getTransactionSyncResult(result, connections);
    return NextResponse.json(
      {
        ...response.body,
        syncInProgress: leaseResult.busyConnectionCount > 0,
        ...(response.status === 429
          ? { error: "aspsp-rate-limited" }
          : response.status === 500
            ? { error: "transaction-sync-failed" }
            : {})
      },
      { status: response.status }
    );
  } catch (error) {
    console.error("Transaction sync failed", {
      message: error instanceof Error ? error.message : "Unknown error."
    });

    return NextResponse.json(
      { error: "transaction-sync-failed" },
      { status: 500 }
    );
  }
}
