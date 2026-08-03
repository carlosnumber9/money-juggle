import "server-only";

import type {
  EnableBankingAuthorizeSessionResponse,
  EnableBankingPsuHeaders
} from "@/definitions";
import { syncEnableBankingConnectionBalances } from "@/lib/db/enableBankingBalances";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

import { getErrorMessage } from "../shared/getErrorMessage";
import { getSuffix } from "../shared/getSuffix";
import { mapEnableBankingAccountToRow } from "./accountRow";
import { insertConsentEvent } from "./consentEvents";

export async function completeEnableBankingConnection({
  userId,
  bankConnectionId,
  session,
  psuHeaders
}: {
  userId: string;
  bankConnectionId: string;
  session: EnableBankingAuthorizeSessionResponse;
  psuHeaders?: EnableBankingPsuHeaders;
}) {
  const consentExpiresAt = session.access.valid_until;

  await markConnectionLinked({ userId, bankConnectionId, session });
  await upsertAccounts({ userId, bankConnectionId, session });
  await insertConsentEvent({
    userId,
    bankConnectionId,
    eventType: "linked",
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

async function markConnectionLinked(input: CompleteConnectionInput) {
  const supabase = createSupabaseServiceRoleClient();
  const { data: storedConnection, error: loadError } = await supabase
    .from("bank_connections")
    .select("provider_metadata")
    .eq("id", input.bankConnectionId)
    .eq("user_id", input.userId)
    .single();

  if (loadError) {
    throw new Error(`Could not load bank connection: ${loadError.message}`);
  }

  const providerMetadata = getRecord(storedConnection.provider_metadata);
  const storedAspsp = getRecord(providerMetadata.aspsp);
  const { error } = await supabase
    .from("bank_connections")
    .update({
      status: "linked",
      provider_session_id: input.session.session_id,
      consent_expires_at: input.session.access.valid_until,
      provider_metadata: {
        ...providerMetadata,
        aspsp: { ...storedAspsp, ...input.session.aspsp },
        psu_type: input.session.psu_type,
        authorized_access: input.session.access,
        linked_account_count: input.session.accounts.length
      }
    })
    .eq("id", input.bankConnectionId)
    .eq("user_id", input.userId);

  if (error) {
    throw new Error(`Could not complete bank connection: ${error.message}`);
  }
}

type CompleteConnectionInput = {
  userId: string;
  bankConnectionId: string;
  session: EnableBankingAuthorizeSessionResponse;
  psuHeaders?: EnableBankingPsuHeaders;
};

function getRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function upsertAccounts(input: CompleteConnectionInput) {
  if (input.session.accounts.length === 0) {
    return;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from("accounts").upsert(
    input.session.accounts.map((account) =>
      mapEnableBankingAccountToRow({ ...input, account })
    ),
    { onConflict: "user_id,bank_connection_id,provider_account_id" }
  );

  if (error) {
    throw new Error(`Could not store connected accounts: ${error.message}`);
  }
}

async function syncInitialBalances(
  input: Omit<CompleteConnectionInput, "session">
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
