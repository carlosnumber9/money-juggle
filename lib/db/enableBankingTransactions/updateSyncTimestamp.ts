import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

export async function updateConnectionSyncTimestamp({
  userId,
  bankConnectionId,
  providerSessionId,
  fetchedAt
}: {
  userId: string;
  bankConnectionId: string;
  providerSessionId: string | null;
  fetchedAt: string;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("bank_connections")
    .update({
      last_synced_at: fetchedAt,
      last_transaction_synced_at: fetchedAt
    })
    .eq("id", bankConnectionId)
    .eq("user_id", userId)
    .eq("status", "linked")
    .eq("provider_session_id", providerSessionId ?? "");

  if (error) {
    throw new Error(
      `Could not update transaction sync timestamp: ${error.message}`
    );
  }
}
