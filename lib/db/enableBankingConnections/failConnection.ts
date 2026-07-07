import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

import { getSuffix } from "../shared/getSuffix";
import { insertConsentEvent } from "./consentEvents";

export async function failEnableBankingConnection({
  userId,
  bankConnectionId,
  providerStatus,
  message,
  metadata = {}
}: {
  userId: string;
  bankConnectionId: string;
  providerStatus: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseServiceRoleClient();

  console.info("Marking Enable Banking connection as failed", {
    bank_connection_id_suffix: getSuffix(bankConnectionId),
    user_id_suffix: getSuffix(userId),
    provider_status: providerStatus
  });

  const { error } = await supabase
    .from("bank_connections")
    .update({ status: "error", provider_metadata: metadata })
    .eq("id", bankConnectionId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `Could not mark bank connection as failed: ${error.message}`
    );
  }

  await insertConsentEvent({
    userId,
    bankConnectionId,
    eventType: "failed",
    providerStatus,
    message,
    metadata
  });
}
