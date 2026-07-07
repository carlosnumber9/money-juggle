import "server-only";

import { ENABLE_BANKING_PROVIDER } from "@/definitions";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

import type { StoredConnectionForTransactionSync } from "./types";

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
      accounts (
        id,
        provider_account_id,
        name,
        iban_last4
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
    status: connection.status,
    provider_session_id: connection.provider_session_id,
    accounts: connection.accounts ?? []
  }));
}
