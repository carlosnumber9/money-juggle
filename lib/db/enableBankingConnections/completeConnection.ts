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
import { BankAccountMatchError } from "./accountMatching";
import {
  preparePendingReconnection,
  readPendingReconnection
} from "./pendingSession";

export async function completeEnableBankingConnection({
  userId,
  bankConnectionId,
  session,
  psuHeaders,
  providerState,
  confirmation
}: {
  userId: string;
  bankConnectionId: string;
  session: EnableBankingAuthorizeSessionResponse;
  psuHeaders?: EnableBankingPsuHeaders;
  providerState: string | null;
  confirmation?: { reviewId: string; matches: Array<string | null> };
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
  const providerMetadata = getRecord(storedConnection.provider_metadata);
  const pending = readPendingReconnection(
    providerMetadata.pending_reconnection
  );
  const expectedStatus = confirmation ? "error" : "linking";
  if (
    storedConnection.status !== expectedStatus ||
    storedConnection.provider_state !== providerState
  ) {
    throw new Error("Bank authorization state has changed.");
  }
  if (
    confirmation &&
    (!pending ||
      pending.reviewId !== confirmation.reviewId ||
      pending.session.session_id !== session.session_id)
  )
    throw new Error("Bank account review has expired or changed.");
  const expectedAspsp = getRecord(providerMetadata.aspsp);
  if (
    expectedAspsp.name !== session.aspsp.name ||
    expectedAspsp.country !== session.aspsp.country
  ) {
    throw new Error(
      "Authorized institution does not match the bank connection."
    );
  }
  let accountIdentifications: Record<string, string[]>;
  try {
    accountIdentifications = await persistSessionAccounts({
      userId,
      bankConnectionId,
      accounts: session.accounts,
      providerMetadata,
      previousSessionId: storedConnection.provider_session_id,
      aspsp: session.aspsp,
      confirmedMatches: confirmation?.matches,
      identifiers: confirmation ? pending!.identifiers : undefined
    });
  } catch (error) {
    if (error instanceof BankAccountMatchError && !confirmation) {
      const { error: pendingError } = await supabase
        .from("bank_connections")
        .update({
          provider_metadata: {
            ...providerMetadata,
            pending_reconnection: preparePendingReconnection({
              userId,
              bankConnectionId,
              session
            })
          }
        })
        .eq("id", bankConnectionId)
        .eq("user_id", userId)
        .eq("status", "linking")
        .eq("provider_state", providerState ?? "")
        .select("id")
        .single();
      if (pendingError)
        throw new Error("Could not preserve bank account review.");
    }
    throw error;
  }
  await markConnectionLinked(
    { userId, bankConnectionId, session, providerState, expectedStatus },
    {
      ...providerMetadata,
      account_identifications: accountIdentifications,
      pending_reconnection: null
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
      consent_expires_at: consentExpiresAt,
      account_matching: confirmation ? "owner-confirmed" : "automatic"
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
        transaction_retry_after: null,
        session_authorized_at: new Date().toISOString()
      }
    })
    .eq("id", input.bankConnectionId)
    .eq("user_id", input.userId)
    .eq("status", input.expectedStatus)
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
  expectedStatus: string;
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
