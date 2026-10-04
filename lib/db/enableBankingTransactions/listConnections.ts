import "server-only";

import { ENABLE_BANKING_PROVIDER } from "@/definitions";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

import type { StoredConnectionForTransactionSync } from "./types";
import { getRecord } from "../enableBankingConnections/records";

export async function listConnectionsForTransactionSync(
  userId: string
): Promise<StoredConnectionForTransactionSync[]> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("bank_connections")
    .select(
      `
      id,
      user_id,
      status,
      provider_session_id,
      consent_expires_at,
      provider_metadata,
      provider_rate_limited_until,
      last_transaction_synced_at,
      institutions ( name ),
      accounts (
        id,
        provider_account_id,
        status,
        name,
        iban_last4,
        iban_fingerprint
      )
    `
    )
    .eq("user_id", userId)
    .eq("provider", ENABLE_BANKING_PROVIDER)
    .eq("status", "linked");

  if (error) {
    throw new Error(
      `Could not load connections for transaction sync: ${error.message}`
    );
  }

  return (data ?? []).map((connection) => ({
    id: connection.id,
    user_id: connection.user_id,
    institution_name: (Array.isArray(connection.institutions)
      ? connection.institutions[0]
      : connection.institutions
    )?.name,
    status: connection.status,
    provider_session_id: connection.provider_session_id,
    consent_expires_at: connection.consent_expires_at,
    transaction_retry_after:
      typeof getRecord(connection.provider_metadata).transaction_retry_after ===
      "string"
        ? (getRecord(connection.provider_metadata)
            .transaction_retry_after as string)
        : null,
    transaction_sync_incomplete:
      getRecord(connection.provider_metadata).transaction_sync_incomplete ===
      true,
    provider_rate_limited_until: connection.provider_rate_limited_until,
    last_transaction_synced_at: connection.last_transaction_synced_at,
    accounts: (connection.accounts ?? []).filter(
      (account) => account.status === "active"
    )
  }));
}
