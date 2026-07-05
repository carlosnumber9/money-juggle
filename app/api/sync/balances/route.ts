import { NextResponse } from "next/server";

import { isEmailAllowed } from "@/lib/auth/allowlist";
import { isDemoMode } from "@/lib/demo/mode";
import { syncStaleEnableBankingBalances } from "@/lib/db/enable-banking-balances";
import { listUserEnableBankingConnections } from "@/lib/db/enable-banking-connections";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  if (isDemoMode()) {
    return NextResponse.json({ synced: false });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "login-required" }, { status: 401 });
  }

  if (!isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "not-allowed" }, { status: 403 });
  }

  try {
    const connections = await listUserEnableBankingConnections(user.id);
    const synced = await syncStaleEnableBankingBalances({
      userId: user.id,
      connections
    });

    console.info("Balance auto sync completed", {
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
