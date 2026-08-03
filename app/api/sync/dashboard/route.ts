import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isEmailAllowed } from "@/lib/auth/allowlist";
import { isDemoMode } from "@/lib/demo/mode";
import { syncStaleEnableBankingBalances } from "@/lib/db/enableBankingBalances";
import { listUserEnableBankingConnections } from "@/lib/db/enableBankingConnections";
import { syncEnableBankingTransactions } from "@/lib/db/enableBankingTransactions";
import { withConnectionSyncLeases } from "@/lib/db/enableBankingSync/connectionLease";
import { getIncrementalProviderDateRange } from "@/lib/domain/transactionRanges";
import { getCurrentSupabaseUser } from "@/lib/supabase/currentUser";

import { getDashboardSyncResult } from "./result";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({ synced: false });
  }

  const user = await getCurrentSupabaseUser();

  if (!user) {
    return NextResponse.json({ error: "login-required" }, { status: 401 });
  }

  if (!isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "not-allowed" }, { status: 403 });
  }

  try {
    const force = request.nextUrl.searchParams.get("force") === "true";
    const connections = await listUserEnableBankingConnections(user.id, {
      useServiceRole: true
    });
    const range = getIncrementalProviderDateRange();
    const leaseResult = await withConnectionSyncLeases({
      userId: user.id,
      bankConnectionIds: connections.map((connection) => connection.id),
      run: async (acquiredConnectionIds) => {
        const balances = await syncStaleEnableBankingBalances({
          userId: user.id,
          connections: connections.filter((connection) =>
            acquiredConnectionIds.has(connection.id)
          ),
          force
        });
        const transactions = await syncEnableBankingTransactions({
          userId: user.id,
          dateFrom: range.from,
          dateTo: range.to,
          mode: "incremental",
          bankConnectionIds: acquiredConnectionIds
        });

        return { balances, transactions };
      }
    });
    const { balances, transactions } = leaseResult.value;
    const result = getDashboardSyncResult({ balances, transactions });

    console.info("Dashboard sync completed", {
      user_id_suffix: user.id.slice(-8),
      force,
      balance_succeeded_connection_count: balances.succeededConnectionCount,
      balance_failed_connection_count: balances.failedConnectionCount,
      transaction_succeeded_account_count: transactions.succeededAccountCount,
      transaction_failed_account_count: transactions.failedAccountCount,
      rate_limited: result.body.rateLimited,
      cooldown_until: result.body.cooldownUntil,
      acquired_connection_count: leaseResult.acquiredConnectionCount,
      busy_connection_count: leaseResult.busyConnectionCount
    });

    return NextResponse.json(
      {
        ...result.body,
        syncInProgress: leaseResult.busyConnectionCount > 0
      },
      { status: result.status }
    );
  } catch (error) {
    console.error("Dashboard sync failed", {
      message: error instanceof Error ? error.message : "Unknown error."
    });

    return NextResponse.json(
      { error: "dashboard-sync-failed" },
      { status: 500 }
    );
  }
}
