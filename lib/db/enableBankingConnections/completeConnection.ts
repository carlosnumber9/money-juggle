import "server-only";

import type {
  EnableBankingAuthorizeSessionResponse,
  EnableBankingPsuHeaders
} from "@/definitions";
import { syncEnableBankingConnectionBalances } from "@/lib/db/enableBankingBalances";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

import { getErrorMessage } from "../shared/getErrorMessage";
import { getSuffix } from "../shared/getSuffix";
import { persistSessionAccounts } from "./persistSessionAccounts";
import { getRecord } from "./records";
import { insertConsentEvent } from "./consentEvents";

export async function completeEnableBankingConnection({
  userId,
  bankConnectionId,
  session,
  psuHeaders,
  providerState
}: {
  userId: string;
  bankConnectionId: string;
  session: EnableBankingAuthorizeSessionResponse;
  psuHeaders?: EnableBankingPsuHeaders;
  providerState: string | null;
}) {
  const consentExpiresAt = session.access.valid_until;

  const supabase = createSupabaseServiceRoleClient();
  const { data: storedConnection, error } = await supabase
    .from("bank_connections")
    .select("provider_metadata,provider_session_id,provider_state,status")
    .eq("id", bankConnectionId)
    .eq("user_id", userId)
    .single();
  if (error)
    throw new Error(`Could not load bank connection: ${error.message}`);
  if (
    storedConnection.status !== "linking" ||
    storedConnection.provider_state !== providerState
  ) {
    throw new Error("Bank authorization state has changed.");
  }
  const providerMetadata = getRecord(storedConnection.provider_metadata);
  const expectedAspsp = getRecord(providerMetadata.aspsp);
  if (
    expectedAspsp.name !== session.aspsp.name ||
    expectedAspsp.country !== session.aspsp.country
  ) {
    throw new Error(
      "Authorized institution does not match the bank connection."
    );
  }
  const accountIdentifications = await persistSessionAccounts({
    userId,
    bankConnectionId,
    accounts: session.accounts,
    providerMetadata
  });
  await markConnectionLinked(
    { userId, bankConnectionId, session, providerState },
    {
      ...providerMetadata,
      account_identifications: accountIdentifications
    }
  );
  await insertConsentEvent({
    userId,
    bankConnectionId,
    eventType: storedConnection.provider_session_id ? "reconnected" : "linked",
    providerStatus: "linked",
    message: "Enable Banking session was authorized and accounts were stored.",
    metadata: {
      session_id: session.session_id,
      account_count: session.accounts.length,
      consent_expires_at: consentExpiresAt
    }
  });
  await syncInitialBalances({ userId, bankConnectionId, psuHeaders });
}

async function markConnectionLinked(
  input: CompleteConnectionInput,
  providerMetadata: Record<string, unknown>
) {
  const supabase = createSupabaseServiceRoleClient();
  const storedAspsp = getRecord(providerMetadata.aspsp);
  const { error } = await supabase
    .from("bank_connections")
    .update({
      status: "linked",
      provider_session_id: input.session.session_id,
      consent_expires_at: input.session.access.valid_until,
      last_transaction_synced_at: null,
      provider_rate_limited_until: null,
      provider_metadata: {
        ...providerMetadata,
        aspsp: { ...storedAspsp, ...input.session.aspsp },
        psu_type: input.session.psu_type,
        authorized_access: input.session.access,
        linked_account_count: input.session.accounts.length,
        transaction_sync_incomplete: false,
        transaction_retry_after: null
      }
    })
    .eq("id", input.bankConnectionId)
    .eq("user_id", input.userId)
    .eq("status", "linking")
    .eq("provider_state", input.providerState ?? "")
    .select("id")
    .single();

  if (error) {
    throw new Error(`Could not complete bank connection: ${error.message}`);
  }
}

type CompleteConnectionInput = {
  userId: string;
  bankConnectionId: string;
  session: EnableBankingAuthorizeSessionResponse;
  psuHeaders?: EnableBankingPsuHeaders;
  providerState: string | null;
};

async function syncInitialBalances(
  input: Pick<
    CompleteConnectionInput,
    "userId" | "bankConnectionId" | "psuHeaders"
  >
) {
  try {
    await syncEnableBankingConnectionBalances(input);
  } catch (error) {
    console.error("Initial Enable Banking balance sync failed", {
      bank_connection_id_suffix: getSuffix(input.bankConnectionId),
      user_id_suffix: getSuffix(input.userId),
      message: getErrorMessage(error)
    });
  }
}
