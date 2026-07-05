import "server-only";

import type {
  AccountBalanceSummary,
  EnableBankingAccountResource,
  EnableBankingAccess,
  EnableBankingAspsp,
  EnableBankingAuthorizeSessionResponse,
  EnableBankingStartAuthorizationResponse,
  StoredBankConnection,
  UserBankConnectionSummary,
  ConsentEventType
} from "@/definitions";
import { ENABLE_BANKING_PROVIDER } from "@/definitions";
import { syncEnableBankingConnectionBalances } from "@/lib/db/enable-banking-balances";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

const BALANCE_TYPE_PRIORITY = [
  "CLBD",
  "CLAV",
  "ITBD",
  "ITAV",
  "XPCD",
  "VALU",
  "INFO",
  "OPBD",
  "OPAV",
  "PRCD",
  "FWAV",
  "OTHR"
];

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
  const consentExpiresAt =
    authorization.access?.valid_until ?? requestedAccess.valid_until;

  console.info("Persisting Enable Banking linking connection", {
    user_id_suffix: getSuffix(userId),
    aspsp_name: aspsp.name,
    country: aspsp.country,
    state_suffix: getSuffix(state),
    authorization_id_suffix: getSuffix(authorization.authorization_id),
    has_authorization_access: Boolean(authorization.access),
    consent_expires_at: consentExpiresAt
  });

  await ensureProfile({ userId, email });
  console.info("Enable Banking profile ensured", {
    user_id_suffix: getSuffix(userId)
  });

  const institutionId = await upsertInstitution(aspsp);
  console.info("Enable Banking institution ensured", {
    institution_id_suffix: getSuffix(institutionId),
    aspsp_name: aspsp.name,
    country: aspsp.country
  });

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
      consent_expires_at: consentExpiresAt,
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

  console.info("Enable Banking bank connection inserted", {
    bank_connection_id_suffix: getSuffix(connection.id),
    user_id_suffix: getSuffix(connection.user_id),
    institution_id_suffix: getSuffix(connection.institution_id),
    status: connection.status,
    state_suffix: getSuffix(connection.provider_state)
  });

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

  console.info("Enable Banking created consent event inserted", {
    bank_connection_id_suffix: getSuffix(connection.id),
    user_id_suffix: getSuffix(userId)
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

  console.info("Enable Banking redirected consent event inserted", {
    bank_connection_id_suffix: getSuffix(connection.id),
    user_id_suffix: getSuffix(userId)
  });

  return connection;
}

export async function getLinkingConnectionByState({
  state
}: {
  state: string;
}): Promise<StoredBankConnection | null> {
  const supabase = createSupabaseServiceRoleClient();

  console.info("Loading Enable Banking linking connection by state", {
    state_suffix: getSuffix(state)
  });

  const { data, error } = await supabase
    .from("bank_connections")
    .select("id,user_id,institution_id,status,provider_state")
    .eq("provider", ENABLE_BANKING_PROVIDER)
    .eq("provider_state", state)
    .eq("status", "linking")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load bank connection: ${error.message}`);
  }

  console.info("Enable Banking linking connection lookup completed", {
    state_suffix: getSuffix(state),
    found: Boolean(data),
    bank_connection_id_suffix: getSuffix(data?.id),
    user_id_suffix: getSuffix(data?.user_id),
    status: data?.status ?? null
  });

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

  console.info("Marking Enable Banking connection as failed", {
    bank_connection_id_suffix: getSuffix(bankConnectionId),
    user_id_suffix: getSuffix(userId),
    provider_status: providerStatus
  });

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

  console.info("Completing Enable Banking connection", {
    bank_connection_id_suffix: getSuffix(bankConnectionId),
    user_id_suffix: getSuffix(userId),
    session_id_suffix: getSuffix(session.session_id),
    account_count: session.accounts.length
  });

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

  console.info("Enable Banking connection marked linked", {
    bank_connection_id_suffix: getSuffix(bankConnectionId),
    user_id_suffix: getSuffix(userId),
    account_count: session.accounts.length
  });

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

    console.info("Enable Banking accounts upserted", {
      bank_connection_id_suffix: getSuffix(bankConnectionId),
      user_id_suffix: getSuffix(userId),
      account_count: session.accounts.length
    });
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

  try {
    await syncEnableBankingConnectionBalances({
      userId,
      bankConnectionId
    });

    console.info("Initial Enable Banking balance sync completed", {
      bank_connection_id_suffix: getSuffix(bankConnectionId),
      user_id_suffix: getSuffix(userId)
    });
  } catch (error) {
    console.error("Initial Enable Banking balance sync failed", {
      bank_connection_id_suffix: getSuffix(bankConnectionId),
      user_id_suffix: getSuffix(userId),
      message: error instanceof Error ? error.message : "Unknown error."
    });
  }
}

export async function listUserEnableBankingConnections(
  userId: string,
  options: { useServiceRole?: boolean } = {}
): Promise<UserBankConnectionSummary[]> {
  const supabase = options.useServiceRole
    ? createSupabaseServiceRoleClient()
    : await createSupabaseServerClient();
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

  const latestBalancesByAccountId = await listLatestBalancesByAccountId(
    userId,
    (connections ?? []).flatMap((connection) =>
      (connection.accounts ?? []).map((account) => account.id)
    ),
    options
  );

  return (connections ?? []).map((connection) => ({
    id: connection.id,
    status: connection.status,
    consent_expires_at: connection.consent_expires_at,
    institution: Array.isArray(connection.institutions)
      ? (connection.institutions[0] ?? null)
      : connection.institutions,
    accounts: (connection.accounts ?? []).map((account) => ({
      ...account,
      latest_balance: latestBalancesByAccountId.get(account.id) ?? null
    }))
  }));
}

async function listLatestBalancesByAccountId(
  userId: string,
  accountIds: string[],
  options: { useServiceRole?: boolean } = {}
): Promise<Map<string, AccountBalanceSummary>> {
  if (accountIds.length === 0) {
    return new Map();
  }

  const supabase = options.useServiceRole
    ? createSupabaseServiceRoleClient()
    : await createSupabaseServerClient();
  const { data: balances, error } = await supabase
    .from("balances")
    .select(
      `
      account_id,
      balance_type,
      amount,
      currency,
      reference_date,
      fetched_at
    `
    )
    .eq("user_id", userId)
    .in("account_id", accountIds)
    .order("fetched_at", { ascending: false });

  if (error) {
    throw new Error(`Could not list latest balances: ${error.message}`);
  }

  const latestBalancesByAccountId = new Map<string, AccountBalanceSummary>();

  for (const balance of balances ?? []) {
    const current = latestBalancesByAccountId.get(balance.account_id);
    const candidate = {
      balance_type: balance.balance_type,
      amount: String(balance.amount),
      currency: balance.currency,
      reference_date: balance.reference_date,
      fetched_at: balance.fetched_at
    } satisfies AccountBalanceSummary;

    if (!current || shouldReplaceLatestBalance(current, candidate)) {
      latestBalancesByAccountId.set(balance.account_id, candidate);
    }
  }

  return latestBalancesByAccountId;
}

function shouldReplaceLatestBalance(
  current: AccountBalanceSummary,
  candidate: AccountBalanceSummary
): boolean {
  if (candidate.fetched_at > current.fetched_at) {
    return true;
  }

  if (candidate.fetched_at < current.fetched_at) {
    return false;
  }

  return (
    getBalanceTypePriority(candidate.balance_type) <
    getBalanceTypePriority(current.balance_type)
  );
}

function getBalanceTypePriority(balanceType: string): number {
  const index = BALANCE_TYPE_PRIORITY.indexOf(balanceType);

  return index === -1 ? BALANCE_TYPE_PRIORITY.length : index;
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

function getSuffix(value: string | null | undefined): string | null {
  return value ? value.slice(-8) : null;
}

function fallbackName(account: EnableBankingAccountResource): string {
  const ibanLast4 = getLast4(account.account_id?.iban);

  if (ibanLast4) {
    return `Account ${ibanLast4}`;
  }

  return `Account ${account.uid.slice(0, 8)}`;
}
