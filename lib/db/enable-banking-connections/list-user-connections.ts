import "server-only";

import type { UserBankConnectionSummary } from "@/definitions";
import { ENABLE_BANKING_PROVIDER } from "@/definitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

import { listLatestBalancesByAccountId } from "./latest-balances";

export async function listUserEnableBankingConnections(
  userId: string,
  options: { useServiceRole?: boolean } = {}
): Promise<UserBankConnectionSummary[]> {
  const supabase = options.useServiceRole
    ? createSupabaseServiceRoleClient()
    : await createSupabaseServerClient();
  const { data: connections, error } = await supabase
    .from("bank_connections")
    .select(
      `
      id,
      status,
      consent_expires_at,
      created_at,
      updated_at,
      institutions ( name, country, logo_url ),
      accounts ( id, name, currency, iban_last4, account_type, status )
    `
    )
    .eq("user_id", userId)
    .eq("provider", ENABLE_BANKING_PROVIDER)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not list bank connections: ${error.message}`);
  }

  const latestBalancesByAccountId = await listLatestBalancesByAccountId(
    userId,
    (connections ?? []).flatMap((connection) =>
      (connection.accounts ?? []).map((account) => account.id)
    ),
    options
  );

  return (connections ?? []).map((connection) => ({
    id: connection.id,
    status: connection.status,
    consent_expires_at: connection.consent_expires_at,
    created_at: connection.created_at,
    updated_at: connection.updated_at,
    institution: Array.isArray(connection.institutions)
      ? (connection.institutions[0] ?? null)
      : connection.institutions,
    accounts: (connection.accounts ?? []).map((account) => ({
      ...account,
      latest_balance: latestBalancesByAccountId.get(account.id) ?? null
    }))
  }));
}
