import "server-only";

import type {
  BankConnectionSummary,
  EnableBankingBalanceResource
} from "@/definitions";
import { ENABLE_BANKING_PROVIDER } from "@/definitions";
import { getEnableBankingAccountBalances } from "@/lib/enable-banking/client";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

const BALANCE_AUTO_REFRESH_MS = 15 * 60 * 1000;

type StoredAccountForBalanceSync = {
  id: string;
  provider_account_id: string;
  currency: string;
};

type StoredConnectionForBalanceSync = {
  id: string;
  user_id: string;
  status: string;
  provider_session_id: string | null;
  accounts: StoredAccountForBalanceSync[];
};

export async function syncStaleEnableBankingBalances({
  userId,
  connections,
  maxAgeMs = BALANCE_AUTO_REFRESH_MS
}: {
  userId: string;
  connections: BankConnectionSummary[];
  maxAgeMs?: number;
}): Promise<boolean> {
  const staleConnectionIds = connections
    .filter((connection) => shouldRefreshConnection(connection, maxAgeMs))
    .map((connection) => connection.id);

  console.info("Balance sync eligibility checked", {
    connection_count: connections.length,
    stale_connection_count: staleConnectionIds.length
  });

  let synced = false;

  for (const bankConnectionId of staleConnectionIds) {
    try {
      await syncEnableBankingConnectionBalances({
        userId,
        bankConnectionId
      });
      synced = true;
    } catch (error) {
      console.error("Enable Banking balance sync failed", {
        bankConnectionId,
        message: getErrorMessage(error)
      });
    }
  }

  return synced;
}

export async function syncEnableBankingConnectionBalances({
  userId,
  bankConnectionId
}: {
  userId: string;
  bankConnectionId: string;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const connection = await getConnectionForBalanceSync({
    userId,
    bankConnectionId
  });

  if (
    !connection ||
    connection.status !== "linked" ||
    !connection.provider_session_id ||
    connection.accounts.length === 0
  ) {
    console.info("Balance sync skipped for connection", {
      reason: getBalanceSyncSkipReason(connection),
      bank_connection_id: bankConnectionId
    });

    return;
  }

  const syncRunId = await createSyncRun({
    userId,
    bankConnectionId,
    accountCount: connection.accounts.length
  });
  const fetchedAt = new Date().toISOString();
  const rows = [];
  const failures = [];

  for (const account of connection.accounts) {
    try {
      console.info("Fetching Enable Banking balances", {
        bank_connection_id: bankConnectionId,
        account_id: account.id
      });

      const balances = await getEnableBankingAccountBalances(
        account.provider_account_id
      );

      rows.push(
        ...balances.map((balance) =>
          mapBalanceToRow({
            userId,
            accountId: account.id,
            accountCurrency: account.currency,
            balance,
            fetchedAt
          })
        )
      );
    } catch (error) {
      failures.push({
        account_id: account.id,
        provider_account_id: account.provider_account_id,
        message: getErrorMessage(error)
      });
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("balances").insert(rows);

    if (error) {
      await finishSyncRun({
        syncRunId,
        status: "failed",
        errorCode: "balance-insert-failed",
        errorMessage: error.message,
        metadata: {
          balance_count: rows.length,
          failures
        }
      });

      throw new Error(`Could not store balances: ${error.message}`);
    }
  }

  const status = failures.length > 0 ? "partial" : "succeeded";

  await finishSyncRun({
    syncRunId,
    status,
    metadata: {
      balance_count: rows.length,
      failures
    }
  });

  if (rows.length > 0) {
    const { error } = await supabase
      .from("bank_connections")
      .update({ last_synced_at: fetchedAt })
      .eq("id", bankConnectionId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(
        `Could not update balance sync timestamp: ${error.message}`
      );
    }
  }

  if (failures.length > 0 && rows.length === 0) {
    throw new Error("Could not fetch balances for any linked account.");
  }
}

function getBalanceSyncSkipReason(
  connection: StoredConnectionForBalanceSync | null
): string {
  if (!connection) {
    return "connection-not-found";
  }

  if (connection.status !== "linked") {
    return "connection-not-linked";
  }

  if (!connection.provider_session_id) {
    return "missing-provider-session-id";
  }

  if (connection.accounts.length === 0) {
    return "no-accounts";
  }

  return "unknown";
}

async function getConnectionForBalanceSync({
  userId,
  bankConnectionId
}: {
  userId: string;
  bankConnectionId: string;
}): Promise<StoredConnectionForBalanceSync | null> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("bank_connections")
    .select(
      `
      id,
      user_id,
      status,
      provider_session_id,
      accounts (
        id,
        provider_account_id,
        currency
      )
    `
    )
    .eq("id", bankConnectionId)
    .eq("user_id", userId)
    .eq("provider", ENABLE_BANKING_PROVIDER)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load connection for balance sync: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    user_id: data.user_id,
    status: data.status,
    provider_session_id: data.provider_session_id,
    accounts: data.accounts ?? []
  };
}

async function createSyncRun({
  userId,
  bankConnectionId,
  accountCount
}: {
  userId: string;
  bankConnectionId: string;
  accountCount: number;
}): Promise<string> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("sync_runs")
    .insert({
      user_id: userId,
      bank_connection_id: bankConnectionId,
      status: "running",
      metadata: {
        kind: "balances",
        account_count: accountCount
      }
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Could not create balance sync run: ${error.message}`);
  }

  return data.id;
}

async function finishSyncRun({
  syncRunId,
  status,
  errorCode,
  errorMessage,
  metadata
}: {
  syncRunId: string;
  status: "succeeded" | "failed" | "partial";
  errorCode?: string;
  errorMessage?: string;
  metadata: Record<string, unknown>;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("sync_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      error_code: errorCode ?? null,
      error_message: errorMessage ?? null,
      metadata: {
        kind: "balances",
        ...metadata
      }
    })
    .eq("id", syncRunId);

  if (error) {
    throw new Error(`Could not finish balance sync run: ${error.message}`);
  }
}

function shouldRefreshConnection(
  connection: BankConnectionSummary,
  maxAgeMs: number
): boolean {
  if (connection.status !== "linked" || connection.accounts.length === 0) {
    return false;
  }

  return connection.accounts.some((account) => {
    if (!account.latest_balance) {
      return true;
    }

    const fetchedAt = new Date(account.latest_balance.fetched_at).getTime();

    return Number.isNaN(fetchedAt) || Date.now() - fetchedAt > maxAgeMs;
  });
}

function mapBalanceToRow({
  userId,
  accountId,
  accountCurrency,
  balance,
  fetchedAt
}: {
  userId: string;
  accountId: string;
  accountCurrency: string;
  balance: EnableBankingBalanceResource;
  fetchedAt: string;
}) {
  return {
    user_id: userId,
    account_id: accountId,
    balance_type: balance.balance_type,
    amount: balance.balance_amount.amount,
    currency: getCurrency(balance.balance_amount.currency, accountCurrency),
    reference_date: balance.reference_date ?? null,
    fetched_at: fetchedAt
  };
}

function getCurrency(value: string | undefined, fallback: string): string {
  if (value && /^[A-Z]{3}$/.test(value)) {
    return value;
  }

  return fallback;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error.";
}
