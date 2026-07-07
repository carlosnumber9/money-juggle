import "server-only";

import type { StoredBankConnection } from "@/definitions";
import { ENABLE_BANKING_PROVIDER } from "@/definitions";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

import { getSuffix } from "../shared/getSuffix";
import {
  getProviderMetadata,
  insertCreationEvents,
  type CreateLinkingConnectionInput
} from "./creationEvents";
import { ensureProfile } from "./ensureProfile";
import { upsertInstitution } from "./upsertInstitution";

export async function createLinkingEnableBankingConnection(
  input: CreateLinkingConnectionInput
): Promise<StoredBankConnection> {
  const supabase = createSupabaseServiceRoleClient();
  const consentExpiresAt =
    input.authorization.access?.valid_until ??
    input.requestedAccess.valid_until;

  await ensureProfile({ userId: input.userId, email: input.email });
  const institutionId = await upsertInstitution(input.aspsp);
  const { data: connection, error } = await supabase
    .from("bank_connections")
    .insert({
      user_id: input.userId,
      institution_id: institutionId,
      provider: ENABLE_BANKING_PROVIDER,
      provider_authorization_id: input.authorization.authorization_id,
      provider_state: input.state,
      provider_psu_id_hash: input.authorization.psu_id_hash,
      status: "linking",
      consent_expires_at: consentExpiresAt,
      redirect_url: input.authorization.url,
      provider_metadata: getProviderMetadata(input)
    })
    .select("id,user_id,institution_id,status,provider_state")
    .single();

  if (error) {
    throw new Error(`Could not create bank connection: ${error.message}`);
  }

  await insertCreationEvents(input, connection.id);
  console.info("Enable Banking bank connection inserted", {
    bank_connection_id_suffix: getSuffix(connection.id),
    user_id_suffix: getSuffix(connection.user_id),
    institution_id_suffix: getSuffix(connection.institution_id),
    status: connection.status
  });

  return connection;
}
