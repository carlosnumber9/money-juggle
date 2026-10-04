import "server-only";

import type { UserBankConnectionSummary } from "@/definitions";
import { ENABLE_BANKING_PROVIDER } from "@/definitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

import { listLatestBalancesByAccountId } from "./latestBalances";
import { getRecord } from "./records";
import { readPendingReconnection } from "./pendingSession";

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
      provider_metadata,
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
    account_review_available:
      connection.status === "error" &&
      Boolean(
        readPendingReconnection(
          getRecord(connection.provider_metadata).pending_reconnection
        )
      ),
    consent_expires_at: connection.consent_expires_at,
    linking_started_at:
      typeof getRecord(connection.provider_metadata).linking_started_at ===
      "string"
        ? (getRecord(connection.provider_metadata).linking_started_at as string)
        : null,
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
