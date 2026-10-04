import "server-only";

import {
  ENABLE_BANKING_PROVIDER,
  type EnableBankingAspsp
} from "@/definitions";
import { hasExpiredConsent } from "@/lib/enableBanking/sessionStatus";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { getRecord } from "./records";

export async function getConnectionForReconnection(input: {
  userId: string;
  bankConnectionId: string;
  aspsp: EnableBankingAspsp;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("bank_connections")
    .select(
      "id,user_id,institution_id,status,provider_state,provider_metadata,consent_expires_at,created_at,institutions(name,country)"
    )
    .eq("id", input.bankConnectionId)
    .eq("user_id", input.userId)
    .eq("provider", ENABLE_BANKING_PROVIDER)
    .maybeSingle();
  if (error) throw new Error(`Could not load reconnection: ${error.message}`);
  const institution = Array.isArray(data?.institutions)
    ? data.institutions[0]
    : data?.institutions;
  const startedAt = getRecord(data?.provider_metadata).linking_started_at;
  const staleLinking =
    data?.status === "linking" &&
    Date.now() -
      Date.parse(typeof startedAt === "string" ? startedAt : data.created_at) >=
      15 * 60 * 1000;
  if (
    !data ||
    institution?.name !== input.aspsp.name ||
    institution?.country !== input.aspsp.country ||
    !(
      data.status === "expired" ||
      data.status === "revoked" ||
      data.status === "error" ||
      staleLinking ||
      (data.status === "linked" && hasExpiredConsent(data.consent_expires_at))
    )
  ) {
    throw new Error("This bank connection cannot be reauthorized.");
  }
  return data;
}
