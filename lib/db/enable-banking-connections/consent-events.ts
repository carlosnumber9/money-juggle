import "server-only";

import type { ConsentEventType } from "@/definitions";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export async function insertConsentEvent({
  userId,
  bankConnectionId,
  eventType,
  providerStatus,
  message,
  metadata = {}
}: {
  userId: string;
  bankConnectionId: string;
  eventType: ConsentEventType;
  providerStatus: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from("consent_events").insert({
    user_id: userId,
    bank_connection_id: bankConnectionId,
    event_type: eventType,
    provider_status: providerStatus,
    message,
    metadata
  });

  if (error) {
    throw new Error(`Could not insert consent event: ${error.message}`);
  }
}
