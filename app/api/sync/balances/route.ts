import { NextResponse } from "next/server";

import { isEmailAllowed } from "@/lib/auth/allowlist";
import { isDemoMode } from "@/lib/demo/mode";
import { syncStaleEnableBankingBalances } from "@/lib/db/enableBankingBalances";
import { listUserEnableBankingConnections } from "@/lib/db/enableBankingConnections";
import { getCurrentSupabaseUser } from "@/lib/supabase/currentUser";

export const runtime = "nodejs";

export async function POST() {
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
    const connections = await listUserEnableBankingConnections(user.id, {
      useServiceRole: true
    });
    const synced = await syncStaleEnableBankingBalances({
      userId: user.id,
      connections
    });

    console.info("Balance auto sync completed", {
      user_id_suffix: user.id.slice(-8),
      connection_count: connections.length,
      synced
    });

    return NextResponse.json({ synced });
  } catch (error) {
    console.error("Balance auto sync failed", {
      message: error instanceof Error ? error.message : "Unknown error."
    });

    return NextResponse.json({ error: "balance-sync-failed" }, { status: 500 });
  }
}
