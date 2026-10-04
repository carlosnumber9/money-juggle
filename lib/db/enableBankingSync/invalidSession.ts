import "server-only";

import { ENABLE_BANKING_PROVIDER } from "@/definitions";
import {
  getInvalidSessionState,
  hasExpiredConsent
} from "@/lib/enableBanking/sessionStatus";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { insertConsentEvent } from "../enableBankingConnections/consentEvents";

type SessionOwner = {
  userId: string;
  bankConnectionId: string;
  providerSessionId: string | null;
};

export async function invalidateConnectionSession(
  input: SessionOwner & { providerError: string | undefined }
): Promise<boolean> {
  const status = getInvalidSessionState(input.providerError);
  if (!status || !input.providerSessionId) return false;

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("bank_connections")
    .update({ status })
    .eq("id", input.bankConnectionId)
    .eq("user_id", input.userId)
    .eq("provider", ENABLE_BANKING_PROVIDER)
    .eq("provider_session_id", input.providerSessionId)
    .eq("status", "linked")
    .select("id")
    .maybeSingle();

  if (error)
    throw new Error(`Could not invalidate bank session: ${error.message}`);
  if (data) {
    await insertConsentEvent({
      ...input,
      eventType: status,
      providerStatus: input.providerError ?? status,
      message:
        "Bank access requires a new authorization. Stored financial data was preserved."
    });
  }
  return true;
}

export async function expireConnectionConsent(
  input: SessionOwner & { consentExpiresAt: string | null | undefined }
): Promise<boolean> {
  return hasExpiredConsent(input.consentExpiresAt)
    ? invalidateConnectionSession({
        ...input,
        providerError: "EXPIRED_SESSION"
      })
    : false;
}
