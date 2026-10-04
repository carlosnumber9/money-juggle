import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

import { getSuffix } from "../shared/getSuffix";
import { getRecord } from "./records";
import { insertConsentEvent } from "./consentEvents";

export async function failEnableBankingConnection({
  userId,
  bankConnectionId,
  providerStatus,
  message,
  metadata = {},
  providerState
}: {
  userId: string;
  bankConnectionId: string;
  providerStatus: string;
  message: string;
  metadata?: Record<string, unknown>;
  providerState?: string | null;
}) {
  const supabase = createSupabaseServiceRoleClient();

  console.info("Marking Enable Banking connection as failed", {
    bank_connection_id_suffix: getSuffix(bankConnectionId),
    user_id_suffix: getSuffix(userId),
    provider_status: providerStatus,
    phase: metadata.phase ?? null,
    reason: metadata.reason ?? null
  });

  const { data: connection, error: lookupError } = await supabase
    .from("bank_connections")
    .select("provider_metadata")
    .eq("id", bankConnectionId)
    .eq("user_id", userId)
    .single();
  if (lookupError)
    throw new Error(
      `Could not load failed bank connection: ${lookupError.message}`
    );
  let update = supabase
    .from("bank_connections")
    .update({
      status: "error",
      provider_metadata: {
        ...getRecord(connection.provider_metadata),
        ...metadata
      }
    })
    .eq("id", bankConnectionId)
    .eq("user_id", userId)
    .eq("status", "linking");
  if (providerState) update = update.eq("provider_state", providerState);
  const { data: changed, error } = await update.select("id").maybeSingle();

  if (error) {
    throw new Error(
      `Could not mark bank connection as failed: ${error.message}`
    );
  }

  if (!changed) return;
  await insertConsentEvent({
    userId,
    bankConnectionId,
    eventType: "failed",
    providerStatus,
    message,
    metadata
  });
}
