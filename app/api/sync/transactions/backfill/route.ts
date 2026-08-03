import { NextResponse } from "next/server";

import { isEmailAllowed } from "@/lib/auth/allowlist";
import { isDemoMode } from "@/lib/demo/mode";
import {
  listConnectionsForTransactionSync,
  syncEnableBankingTransactions
} from "@/lib/db/enableBankingTransactions";
import { withConnectionSyncLeases } from "@/lib/db/enableBankingSync/connectionLease";
import { getCurrentYearProviderDateRange } from "@/lib/domain/transactionRanges";
import { getCurrentSupabaseUser } from "@/lib/supabase/currentUser";

export const runtime = "nodejs";

export async function POST() {
  if (isDemoMode()) {
    return NextResponse.json({ synced: false, skipped: true });
  }

  const user = await getCurrentSupabaseUser();

  if (!user) {
    return NextResponse.json({ error: "login-required" }, { status: 401 });
  }

  if (!isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "not-allowed" }, { status: 403 });
  }

  try {
    const range = getCurrentYearProviderDateRange();
    const connections = await listConnectionsForTransactionSync(user.id);
    const leaseResult = await withConnectionSyncLeases({
      userId: user.id,
      bankConnectionIds: connections.map((connection) => connection.id),
      run: (acquiredConnectionIds) =>
        syncEnableBankingTransactions({
          userId: user.id,
          dateFrom: range.from,
          dateTo: range.to,
          mode: "backfill",
          bankConnectionIds: acquiredConnectionIds
        })
    });
    const result = leaseResult.value;
    const skipped = result.attemptedAccountCount === 0;

    console.info("Transaction backfill completed", {
      user_id_suffix: user.id.slice(-8),
      date_from: range.from,
      date_to: range.to,
      mode: "backfill",
      skipped,
      synced: result.synced,
      attempted_account_count: result.attemptedAccountCount,
      succeeded_account_count: result.succeededAccountCount,
      failed_account_count: result.failedAccountCount,
      rate_limited_account_count: result.rateLimitedAccountCount,
      cooldown_connection_count: result.cooldownConnectionCount,
      cooldown_until: result.cooldownUntil,
      fresh_connection_count: result.freshConnectionCount,
      busy_connection_count: leaseResult.busyConnectionCount
    });

    if (
      result.attemptedAccountCount > 0 &&
      result.succeededAccountCount === 0 &&
      result.failedAccountCount > 0
    ) {
      if (result.rateLimitedAccountCount === result.failedAccountCount) {
        return NextResponse.json(
          { error: "aspsp-rate-limited" },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: "transaction-backfill-failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      synced: result.synced,
      skipped,
      partialFailure: result.failedAccountCount > 0,
      rateLimited: result.cooldownConnectionCount > 0,
      cooldownUntil: result.cooldownUntil,
      syncInProgress: leaseResult.busyConnectionCount > 0
    });
  } catch (error) {
    console.error("Transaction backfill failed", {
      message: error instanceof Error ? error.message : "Unknown error."
    });

    return NextResponse.json(
      { error: "transaction-backfill-failed" },
      { status: 500 }
    );
  }
}
