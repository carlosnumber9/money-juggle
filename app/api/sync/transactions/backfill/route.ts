import { NextResponse } from "next/server";

import { isEmailAllowed } from "@/lib/auth/allowlist";
import { isDemoMode } from "@/lib/demo/mode";
import { syncEnableBankingTransactions } from "@/lib/db/enableBankingTransactions";
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
    const result = await syncEnableBankingTransactions({
      userId: user.id,
      dateFrom: range.from,
      dateTo: range.to,
      mode: "backfill"
    });
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
      failed_account_count: result.failedAccountCount
    });

    if (
      result.attemptedAccountCount > 0 &&
      result.succeededAccountCount === 0 &&
      result.failedAccountCount > 0
    ) {
      return NextResponse.json(
        { error: "transaction-backfill-failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      synced: result.synced,
      skipped,
      partialFailure: result.failedAccountCount > 0
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
