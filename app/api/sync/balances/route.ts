import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isEmailAllowed } from "@/lib/auth/allowlist";
import { isDemoMode } from "@/lib/demo/mode";
import { syncStaleEnableBankingBalances } from "@/lib/db/enableBankingBalances";
import { listUserEnableBankingConnections } from "@/lib/db/enableBankingConnections";
import { getCurrentSupabaseUser } from "@/lib/supabase/currentUser";

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
    const result = await syncStaleEnableBankingBalances({
      userId: user.id,
      connections,
      force
    });

    console.info("Balance sync completed", {
      user_id_suffix: user.id.slice(-8),
      connection_count: connections.length,
      force,
      synced: result.synced,
      attempted_connection_count: result.attemptedConnectionCount,
      succeeded_connection_count: result.succeededConnectionCount,
      failed_connection_count: result.failedConnectionCount,
      rate_limited_connection_count: result.rateLimitedConnectionCount
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
      partialFailure: result.failedConnectionCount > 0
    });
  } catch (error) {
    console.error("Balance sync failed", {
      message: error instanceof Error ? error.message : "Unknown error."
    });

    return NextResponse.json({ error: "balance-sync-failed" }, { status: 500 });
  }
}
