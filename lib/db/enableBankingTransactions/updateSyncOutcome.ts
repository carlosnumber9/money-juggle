import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { getRecord } from "../enableBankingConnections/records";
import { getTransactionRetryUntil } from "./retry";

export async function updateTransactionSyncOutcome(input: {
  userId: string;
  bankConnectionId: string;
  providerSessionId: string | null;
  fetchedAt: string;
  incomplete: boolean;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error: lookupError } = await supabase
    .from("bank_connections")
    .select("provider_metadata")
    .eq("id", input.bankConnectionId)
    .eq("user_id", input.userId)
    .eq("status", "linked")
    .eq("provider_session_id", input.providerSessionId ?? "")
    .maybeSingle();
  if (lookupError)
    throw new Error(
      `Could not load transaction sync outcome: ${lookupError.message}`
    );
  if (!data) return;
  const { error } = await supabase
    .from("bank_connections")
    .update({
      provider_metadata: {
        ...getRecord(data.provider_metadata),
        transaction_sync_incomplete: input.incomplete,
        transaction_retry_after: input.incomplete
          ? getTransactionRetryUntil(input.fetchedAt)
          : null
      }
    })
    .eq("id", input.bankConnectionId)
    .eq("user_id", input.userId)
    .eq("status", "linked")
    .eq("provider_session_id", input.providerSessionId ?? "");
  if (error)
    throw new Error(
      `Could not store transaction sync outcome: ${error.message}`
    );
}
