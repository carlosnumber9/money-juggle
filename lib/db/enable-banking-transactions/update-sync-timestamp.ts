import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export async function updateConnectionSyncTimestamp({
  userId,
  bankConnectionId,
  fetchedAt
}: {
  userId: string;
  bankConnectionId: string;
  fetchedAt: string;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("bank_connections")
    .update({ last_synced_at: fetchedAt })
    .eq("id", bankConnectionId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `Could not update transaction sync timestamp: ${error.message}`
    );
  }
}
