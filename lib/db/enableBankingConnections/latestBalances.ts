import "server-only";

import type { AccountBalanceSummary } from "@/definitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

import { shouldReplaceLatestBalance } from "./balancePriority";

export async function listLatestBalancesByAccountId(
  userId: string,
  accountIds: string[],
  options: { useServiceRole?: boolean } = {}
): Promise<Map<string, AccountBalanceSummary>> {
  if (accountIds.length === 0) {
    return new Map();
  }

  const supabase = options.useServiceRole
    ? createSupabaseServiceRoleClient()
    : await createSupabaseServerClient();
  const { data: balances, error } = await supabase
    .from("balances")
    .select(
      `
      account_id,
      balance_type,
      amount,
      currency,
      reference_date,
      fetched_at
    `
    )
    .eq("user_id", userId)
    .in("account_id", accountIds)
    .order("fetched_at", { ascending: false });

  if (error) {
    throw new Error(`Could not list latest balances: ${error.message}`);
  }

  return mapLatestBalances(balances ?? []);
}

function mapLatestBalances(
  balances: Array<AccountBalanceSummary & { account_id: string }>
) {
  const latestBalancesByAccountId = new Map<string, AccountBalanceSummary>();

  for (const balance of balances) {
    const current = latestBalancesByAccountId.get(balance.account_id);
    const candidate = {
      balance_type: balance.balance_type,
      amount: String(balance.amount),
      currency: balance.currency,
      reference_date: balance.reference_date,
      fetched_at: balance.fetched_at
    } satisfies AccountBalanceSummary;

    if (!current || shouldReplaceLatestBalance(current, candidate)) {
      latestBalancesByAccountId.set(balance.account_id, candidate);
    }
  }

  return latestBalancesByAccountId;
}
