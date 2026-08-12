import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isEmailAllowed } from "@/lib/auth/allowlist";
import { syncStaleEnableBankingBalances } from "@/lib/db/enableBankingBalances";
import { listUserEnableBankingConnections } from "@/lib/db/enableBankingConnections";
import { withConnectionSyncLeases } from "@/lib/db/enableBankingSync/connectionLease";
import { getInteractivePsuHeadersByConnection } from "@/lib/db/enableBankingSync/interactivePsuHeaders";
import { getCurrentSupabaseUser } from "@/lib/supabase/currentUser";

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
    const force = request.nextUrl.searchParams.get("force") === "true";
    const connections = await listUserEnableBankingConnections(user.id, {
      useServiceRole: true
    });
    const linkedConnections = connections.filter(
      (connection) =>
        connection.status === "linked" && connection.accounts.length > 0
    );
    const leaseResult = await withConnectionSyncLeases({
      userId: user.id,
      bankConnectionIds: linkedConnections.map((connection) => connection.id),
      run: async (acquiredConnectionIds) => {
        const psuHeadersByConnectionId =
          await getInteractivePsuHeadersByConnection({
            userId: user.id,
            bankConnectionIds: acquiredConnectionIds,
            requestHeaders: request.headers
          });

        return syncStaleEnableBankingBalances({
          userId: user.id,
          connections: linkedConnections.filter((connection) =>
            acquiredConnectionIds.has(connection.id)
          ),
          force,
          psuHeadersByConnectionId
        });
      }
    });
    const result = leaseResult.value;

    console.info("Balance sync completed", {
      user_id_suffix: user.id.slice(-8),
      connection_count: linkedConnections.length,
      force,
      synced: result.synced,
      attempted_connection_count: result.attemptedConnectionCount,
      succeeded_connection_count: result.succeededConnectionCount,
      failed_connection_count: result.failedConnectionCount,
      rate_limited_connection_count: result.rateLimitedConnectionCount,
      cooldown_connection_count: result.cooldownConnectionCount,
      cooldown_until: result.cooldownUntil,
      busy_connection_count: leaseResult.busyConnectionCount
    });

    if (
      result.attemptedConnectionCount > 0 &&
      result.succeededConnectionCount === 0 &&
      result.failedConnectionCount > 0
    ) {
      if (result.rateLimitedConnectionCount === result.failedConnectionCount) {
        return NextResponse.json(
          { error: "aspsp-rate-limited" },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: "balance-sync-failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      synced: result.synced,
      partialFailure: result.failedConnectionCount > 0,
      rateLimited: result.cooldownConnectionCount > 0,
      cooldownUntil: result.cooldownUntil,
      syncInProgress: leaseResult.busyConnectionCount > 0
    });
  } catch (error) {
    console.error("Balance sync failed", {
      message: error instanceof Error ? error.message : "Unknown error."
    });

    return NextResponse.json({ error: "balance-sync-failed" }, { status: 500 });
  }
}
