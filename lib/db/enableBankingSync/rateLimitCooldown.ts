import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

import { ENABLE_BANKING_RATE_LIMIT_COOLDOWN_MS } from "./rateLimitCooldownValue";

export { getActiveRateLimitCooldown } from "./rateLimitCooldownValue";

export async function setConnectionRateLimitCooldown({
  userId,
  bankConnectionId,
  now = new Date()
}: {
  userId: string;
  bankConnectionId: string;
  now?: Date;
}): Promise<string> {
  const cooldownUntil = new Date(
    now.getTime() + ENABLE_BANKING_RATE_LIMIT_COOLDOWN_MS
  ).toISOString();
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("bank_connections")
    .update({ provider_rate_limited_until: cooldownUntil })
    .eq("id", bankConnectionId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `Could not persist provider rate-limit cooldown: ${error.message}`
    );
  }

  return cooldownUntil;
}
