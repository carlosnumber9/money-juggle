import "server-only";

import { ENABLE_BANKING_PROVIDER } from "@/definitions";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

import type { StoredConnectionForBalanceSync } from "./types";

export async function getConnectionForBalanceSync({
  userId,
  bankConnectionId
}: {
  userId: string;
  bankConnectionId: string;
}): Promise<StoredConnectionForBalanceSync | null> {
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
        currency
      )
    `
    )
    .eq("id", bankConnectionId)
    .eq("user_id", userId)
    .eq("provider", ENABLE_BANKING_PROVIDER)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load connection for balance sync: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    user_id: data.user_id,
    status: data.status,
    provider_session_id: data.provider_session_id,
    accounts: data.accounts ?? []
  };
}
