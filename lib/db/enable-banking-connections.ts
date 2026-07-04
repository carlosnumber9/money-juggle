import "server-only";

import type {
  EnableBankingAccountResource,
  EnableBankingAccess,
  EnableBankingAspsp,
  EnableBankingAuthorizeSessionResponse,
  EnableBankingStartAuthorizationResponse
} from "@/lib/enable-banking/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

const ENABLE_BANKING_PROVIDER = "enable_banking";

export type StoredBankConnection = {
  id: string;
  user_id: string;
  institution_id: string;
  status: string;
  provider_state: string | null;
};

export type UserBankConnectionSummary = {
  id: string;
  status: string;
  consent_expires_at: string | null;
  institution: {
    name: string;
    country: string | null;
    logo_url: string | null;
  } | null;
  accounts: Array<{
    id: string;
    name: string;
    currency: string;
    iban_last4: string | null;
    account_type: string | null;
    status: string;
  }>;
};

export function getEnableBankingInstitutionProviderId({
  country,
  name
}: {
  country: string;
  name: string;
}): string {
  return `${country}:${name}`;
}

export async function createLinkingEnableBankingConnection({
  userId,
  email,
  aspsp,
  state,
  redirectUrl,
  requestedAccess,
  authorization
}: {
  userId: string;
  email: string;
  aspsp: EnableBankingAspsp;
  state: string;
  redirectUrl: string;
  requestedAccess: EnableBankingAccess;
  authorization: EnableBankingStartAuthorizationResponse;
}): Promise<StoredBankConnection> {
  const supabase = createSupabaseServiceRoleClient();
  await ensureProfile({ userId, email });
  const institutionId = await upsertInstitution(aspsp);

  const { data: connection, error } = await supabase
    .from("bank_connections")
    .insert({
      user_id: userId,
      institution_id: institutionId,
      provider: ENABLE_BANKING_PROVIDER,
      provider_authorization_id: authorization.authorization_id,
      provider_state: state,
      provider_psu_id_hash: authorization.psu_id_hash,
      status: "linking",
      consent_expires_at: authorization.access.valid_until,
      redirect_url: authorization.url,
      provider_metadata: {
        aspsp: {
          name: aspsp.name,
          country: aspsp.country,
          maximum_consent_validity: aspsp.maximum_consent_validity
        },
        requested_access: requestedAccess,
        requested_redirect_url: redirectUrl
      }
    })
    .select("id,user_id,institution_id,status,provider_state")
    .single();

  if (error) {
    throw new Error(`Could not create bank connection: ${error.message}`);
  }

  await insertConsentEvent({
    userId,
    bankConnectionId: connection.id,
    eventType: "created",
    providerStatus: "linking",
    message: "Enable Banking authorization was created.",
    metadata: {
      authorization_id: authorization.authorization_id,
      aspsp: {
        name: aspsp.name,
        country: aspsp.country
      }
    }
  });

  await insertConsentEvent({
    userId,
    bankConnectionId: connection.id,
    eventType: "redirected",
    providerStatus: "redirected",
    message: "User was redirected to Enable Banking authorization.",
    metadata: {
      authorization_id: authorization.authorization_id
    }
  });

  return connection;
}

export async function getLinkingConnectionByState({
  userId,
  state
}: {
  userId: string;
  state: string;
}): Promise<StoredBankConnection | null> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("bank_connections")
    .select("id,user_id,institution_id,status,provider_state")
    .eq("provider", ENABLE_BANKING_PROVIDER)
    .eq("provider_state", state)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load bank connection: ${error.message}`);
  }

  return data;
}

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
  const { error } = await supabase
    .from("bank_connections")
    .update({
      status: "error",
      provider_metadata: metadata
    })
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

export async function completeEnableBankingConnection({
  userId,
  bankConnectionId,
  session
}: {
  userId: string;
  bankConnectionId: string;
  session: EnableBankingAuthorizeSessionResponse;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const consentExpiresAt = session.access.valid_until;

  const { error: connectionError } = await supabase
    .from("bank_connections")
    .update({
      status: "linked",
      provider_session_id: session.session_id,
      consent_expires_at: consentExpiresAt,
      provider_metadata: {
        aspsp: session.aspsp,
        psu_type: session.psu_type,
        authorized_access: session.access,
        linked_account_count: session.accounts.length
      }
    })
    .eq("id", bankConnectionId)
    .eq("user_id", userId);

  if (connectionError) {
    throw new Error(
      `Could not complete bank connection: ${connectionError.message}`
    );
  }

  if (session.accounts.length > 0) {
    const { error: accountsError } = await supabase.from("accounts").upsert(
      session.accounts.map((account) =>
        mapEnableBankingAccountToRow({ userId, bankConnectionId, account })
      ),
      {
        onConflict: "user_id,bank_connection_id,provider_account_id"
      }
    );

    if (accountsError) {
      throw new Error(
        `Could not store connected accounts: ${accountsError.message}`
      );
    }
  }

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
}

export async function listUserEnableBankingConnections(
  userId: string
): Promise<UserBankConnectionSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data: connections, error } = await supabase
    .from("bank_connections")
    .select(
      `
      id,
      status,
      consent_expires_at,
      institutions (
        name,
        country,
        logo_url
      ),
      accounts (
        id,
        name,
        currency,
        iban_last4,
        account_type,
        status
      )
    `
    )
    .eq("user_id", userId)
    .eq("provider", ENABLE_BANKING_PROVIDER)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not list bank connections: ${error.message}`);
  }

  return (connections ?? []).map((connection) => ({
    id: connection.id,
    status: connection.status,
    consent_expires_at: connection.consent_expires_at,
    institution: Array.isArray(connection.institutions)
      ? (connection.institutions[0] ?? null)
      : connection.institutions,
    accounts: connection.accounts ?? []
  }));
}

async function ensureProfile({
  userId,
  email
}: {
  userId: string;
  email: string;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email
    },
    {
      onConflict: "id"
    }
  );

  if (error) {
    throw new Error(`Could not ensure user profile: ${error.message}`);
  }
}

async function upsertInstitution(aspsp: EnableBankingAspsp): Promise<string> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("institutions")
    .upsert(
      {
        provider: ENABLE_BANKING_PROVIDER,
        provider_institution_id: getEnableBankingInstitutionProviderId(aspsp),
        name: aspsp.name,
        country: aspsp.country,
        logo_url: aspsp.logo,
        status: "active"
      },
      {
        onConflict: "provider,provider_institution_id"
      }
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(`Could not upsert institution: ${error.message}`);
  }

  return data.id;
}

async function insertConsentEvent({
  userId,
  bankConnectionId,
  eventType,
  providerStatus,
  message,
  metadata = {}
}: {
  userId: string;
  bankConnectionId: string;
  eventType: "created" | "redirected" | "linked" | "failed";
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

function mapEnableBankingAccountToRow({
  userId,
  bankConnectionId,
  account
}: {
  userId: string;
  bankConnectionId: string;
  account: EnableBankingAccountResource;
}) {
  const iban = account.account_id?.iban;
  const ibanLast4 = getLast4(iban);
  const name =
    account.name ?? account.details ?? account.product ?? fallbackName(account);

  return {
    user_id: userId,
    bank_connection_id: bankConnectionId,
    provider_account_id: account.uid,
    name,
    iban_last4: ibanLast4,
    currency: getCurrency(account.currency),
    account_type: account.cash_account_type ?? account.product ?? null,
    status: "active"
  };
}

function getLast4(value: string | undefined): string | null {
  const normalized = value?.replace(/[^A-Za-z0-9]/g, "");

  if (!normalized || normalized.length < 4) {
    return null;
  }

  return normalized.slice(-4);
}

function getCurrency(value: string | undefined): string {
  if (value && /^[A-Z]{3}$/.test(value)) {
    return value;
  }

  return "EUR";
}

function fallbackName(account: EnableBankingAccountResource): string {
  const ibanLast4 = getLast4(account.account_id?.iban);

  if (ibanLast4) {
    return `Account ${ibanLast4}`;
  }

  return `Account ${account.uid.slice(0, 8)}`;
}
