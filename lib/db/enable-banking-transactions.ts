import "server-only";

import { createHash } from "node:crypto";

import type {
  EnableBankingTransactionResource,
  MonthlyTransactionRange,
  MonthlyTransactionSummary
} from "@/definitions";
import { ENABLE_BANKING_PROVIDER } from "@/definitions";
import { getEnableBankingAccountTransactions } from "@/lib/enable-banking/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

type StoredAccountForTransactionSync = {
  id: string;
  provider_account_id: string;
  name: string;
  iban_last4: string | null;
};

type StoredConnectionForTransactionSync = {
  id: string;
  user_id: string;
  status: string;
  provider_session_id: string | null;
  accounts: StoredAccountForTransactionSync[];
};

type TransactionRow = {
  user_id: string;
  account_id: string;
  stable_import_key: string;
  identity_source: string;
  provider: string;
  provider_transaction_id: string | null;
  provider_internal_transaction_id: string | null;
  entry_reference: string | null;
  end_to_end_id: string | null;
  deduplication_fingerprint: string | null;
  booking_status: "booked" | "pending" | "information";
  booking_date: string | null;
  booking_datetime: string | null;
  value_date: string | null;
  value_datetime: string | null;
  amount: string;
  currency: string;
  description: string | null;
  merchant_name: string | null;
  counterparty_name: string | null;
  counterparty_account_last4: string | null;
  bank_transaction_code: string | null;
  merchant_category_code: string | null;
};

type StoredMonthlyTransactionRow = {
  id: string;
  account_id: string;
  booking_status: "booked" | "pending" | "information";
  booking_date: string | null;
  amount: string | number;
  currency: string;
  description: string | null;
  merchant_name: string | null;
  counterparty_name: string | null;
  accounts:
    | {
        id: string;
        name: string;
        iban_last4: string | null;
        bank_connections:
          | {
              institutions:
                | {
                    provider_institution_id: string;
                    name: string;
                  }
                | Array<{
                    provider_institution_id: string;
                    name: string;
                  }>;
            }
          | Array<{
              institutions:
                | {
                    provider_institution_id: string;
                    name: string;
                  }
                | Array<{
                    provider_institution_id: string;
                    name: string;
                  }>;
            }>;
      }
    | Array<{
        id: string;
        name: string;
        iban_last4: string | null;
        bank_connections:
          | {
              institutions:
                | {
                    provider_institution_id: string;
                    name: string;
                  }
                | Array<{
                    provider_institution_id: string;
                    name: string;
                  }>;
            }
          | Array<{
              institutions:
                | {
                    provider_institution_id: string;
                    name: string;
                  }
                | Array<{
                    provider_institution_id: string;
                    name: string;
                  }>;
            }>;
      }>;
};

export async function listMonthlyTransactions({
  userId,
  range
}: {
  userId: string;
  range: MonthlyTransactionRange;
}): Promise<MonthlyTransactionSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      id,
      account_id,
      booking_status,
      booking_date,
      amount,
      currency,
      description,
      merchant_name,
      counterparty_name,
      accounts!inner (
        id,
        name,
        iban_last4,
        bank_connections!inner (
          institutions!inner (
            provider_institution_id,
            name
          )
        )
      )
    `
    )
    .eq("user_id", userId)
    .gte("booking_date", range.from)
    .lt("booking_date", range.to)
    .order("booking_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not list transactions: ${error.message}`);
  }

  return ((data ?? []) as StoredMonthlyTransactionRow[]).map((row) =>
    mapStoredTransactionToSummary(row)
  );
}

export async function syncCurrentMonthEnableBankingTransactions({
  userId,
  dateFrom,
  dateTo
}: {
  userId: string;
  dateFrom: string;
  dateTo: string;
}): Promise<{
  synced: boolean;
  attemptedAccountCount: number;
  succeededAccountCount: number;
  failedAccountCount: number;
}> {
  const connections = await listConnectionsForTransactionSync(userId);
  let synced = false;
  let attemptedAccountCount = 0;
  let succeededAccountCount = 0;
  let failedAccountCount = 0;

  for (const connection of connections) {
    if (
      connection.status !== "linked" ||
      !connection.provider_session_id ||
      connection.accounts.length === 0
    ) {
      continue;
    }

    try {
      const result = await syncConnectionTransactions({
        userId,
        connection,
        dateFrom,
        dateTo
      });

      synced = synced || result.synced;
      attemptedAccountCount += result.attemptedAccountCount;
      succeededAccountCount += result.succeededAccountCount;
      failedAccountCount += result.failedAccountCount;
    } catch (error) {
      attemptedAccountCount += connection.accounts.length;
      failedAccountCount += connection.accounts.length;
      console.error("Enable Banking transaction sync failed", {
        bank_connection_id: connection.id,
        message: getErrorMessage(error)
      });
    }
  }

  return {
    synced,
    attemptedAccountCount,
    succeededAccountCount,
    failedAccountCount
  };
}

async function syncConnectionTransactions({
  userId,
  connection,
  dateFrom,
  dateTo
}: {
  userId: string;
  connection: StoredConnectionForTransactionSync;
  dateFrom: string;
  dateTo: string;
}): Promise<{
  synced: boolean;
  attemptedAccountCount: number;
  succeededAccountCount: number;
  failedAccountCount: number;
}> {
  const syncRunId = await createSyncRun({
    userId,
    bankConnectionId: connection.id,
    accountCount: connection.accounts.length,
    dateFrom,
    dateTo
  });
  const fetchedAt = new Date().toISOString();
  const rows: TransactionRow[] = [];
  const failures = [];
  let attemptedAccountCount = 0;
  let succeededAccountCount = 0;

  for (const account of connection.accounts) {
    attemptedAccountCount += 1;

    try {
      console.info("Fetching Enable Banking transactions", {
        bank_connection_id: connection.id,
        account_id: account.id,
        date_from: dateFrom,
        date_to: dateTo
      });

      const transactions = await getEnableBankingAccountTransactions({
        accountId: account.provider_account_id,
        dateFrom,
        dateTo
      });

      rows.push(
        ...transactions
          .map((transaction) =>
            mapTransactionToRow({
              userId,
              accountId: account.id,
              transaction
            })
          )
          .filter((row): row is TransactionRow => Boolean(row))
      );
      succeededAccountCount += 1;
    } catch (error) {
      console.error("Enable Banking transaction account fetch failed", {
        bank_connection_id: connection.id,
        account_id: account.id,
        message: getErrorMessage(error)
      });

      failures.push({
        account_id: account.id,
        provider_account_id: account.provider_account_id,
        message: getErrorMessage(error)
      });
    }
  }

  try {
    await persistTransactionRows(rows, fetchedAt);
  } catch (error) {
    await finishSyncRun({
      syncRunId,
      status: "failed",
      errorCode: "transaction-upsert-failed",
      errorMessage: getErrorMessage(error),
      metadata: {
        transaction_count: rows.length,
        failures
      }
    });

    throw error;
  }

  const status =
    failures.length > 0 && rows.length === 0
      ? "failed"
      : failures.length > 0
        ? "partial"
        : "succeeded";

  await finishSyncRun({
    syncRunId,
    status,
    metadata: {
      transaction_count: rows.length,
      failures
    }
  });

  if (rows.length > 0 || failures.length === 0) {
    await updateConnectionSyncTimestamp({
      userId,
      bankConnectionId: connection.id,
      fetchedAt
    });
  }

  return {
    synced: rows.length > 0,
    attemptedAccountCount,
    succeededAccountCount,
    failedAccountCount: failures.length
  };
}

async function listConnectionsForTransactionSync(
  userId: string
): Promise<StoredConnectionForTransactionSync[]> {
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
        name,
        iban_last4
      )
    `
    )
    .eq("user_id", userId)
    .eq("provider", ENABLE_BANKING_PROVIDER)
    .eq("status", "linked");

  if (error) {
    throw new Error(
      `Could not load connections for transaction sync: ${error.message}`
    );
  }

  return (data ?? []).map((connection) => ({
    id: connection.id,
    user_id: connection.user_id,
    status: connection.status,
    provider_session_id: connection.provider_session_id,
    accounts: connection.accounts ?? []
  }));
}

async function persistTransactionRows(
  rows: TransactionRow[],
  fetchedAt: string
) {
  if (rows.length === 0) {
    return;
  }

  const supabase = createSupabaseServiceRoleClient();

  for (const row of rows) {
    const { data: existing, error: lookupError } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", row.user_id)
      .eq("account_id", row.account_id)
      .eq("stable_import_key", row.stable_import_key)
      .maybeSingle();

    if (lookupError) {
      throw new Error(`Could not lookup transaction: ${lookupError.message}`);
    }

    if (existing) {
      const { error } = await supabase
        .from("transactions")
        .update({
          ...row,
          last_seen_at: fetchedAt
        })
        .eq("id", existing.id)
        .eq("user_id", row.user_id);

      if (error) {
        throw new Error(`Could not update transaction: ${error.message}`);
      }

      continue;
    }

    const { error } = await supabase.from("transactions").insert({
      ...row,
      first_seen_at: fetchedAt,
      last_seen_at: fetchedAt
    });

    if (error) {
      throw new Error(`Could not insert transaction: ${error.message}`);
    }
  }
}

async function createSyncRun({
  userId,
  bankConnectionId,
  accountCount,
  dateFrom,
  dateTo
}: {
  userId: string;
  bankConnectionId: string;
  accountCount: number;
  dateFrom: string;
  dateTo: string;
}): Promise<string> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("sync_runs")
    .insert({
      user_id: userId,
      bank_connection_id: bankConnectionId,
      status: "running",
      metadata: {
        kind: "transactions",
        account_count: accountCount,
        date_from: dateFrom,
        date_to: dateTo
      }
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Could not create transaction sync run: ${error.message}`);
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
        kind: "transactions",
        ...metadata
      }
    })
    .eq("id", syncRunId);

  if (error) {
    throw new Error(`Could not finish transaction sync run: ${error.message}`);
  }
}

async function updateConnectionSyncTimestamp({
  userId,
  bankConnectionId,
  fetchedAt
}: {
  userId: string;
  bankConnectionId: string;
  fetchedAt: string;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("bank_connections")
    .update({ last_synced_at: fetchedAt })
    .eq("id", bankConnectionId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `Could not update transaction sync timestamp: ${error.message}`
    );
  }
}

function mapTransactionToRow({
  userId,
  accountId,
  transaction
}: {
  userId: string;
  accountId: string;
  transaction: EnableBankingTransactionResource;
}): TransactionRow | null {
  const amount = getTransactionAmount(transaction);

  if (!amount) {
    return null;
  }

  const providerTransactionId =
    getTextValue(transaction.transaction_id) ??
    getTextValue(transaction.uid) ??
    null;
  const providerInternalTransactionId =
    getTextValue(transaction.internal_transaction_id) ?? null;
  const entryReference = getTextValue(transaction.entry_reference) ?? null;
  const endToEndId = getTextValue(transaction.end_to_end_id) ?? null;
  const description = getDescription(transaction);
  const counterpartyName = getCounterpartyName(transaction);
  const counterpartyAccountLast4 = getCounterpartyAccountLast4(transaction);
  const merchantName = getTextValue(transaction.merchant_name);
  const bankTransactionCode = getTextValue(transaction.bank_transaction_code);
  const merchantCategoryCode = getTextValue(transaction.merchant_category_code);
  const deduplicationFingerprint = getDeduplicationFingerprint({
    accountId,
    bookingDate: getDate(transaction.booking_date),
    valueDate: getDate(transaction.value_date),
    amount: amount.amount,
    currency: amount.currency,
    description,
    counterpartyName,
    merchantName,
    counterpartyAccountLast4,
    bankTransactionCode,
    merchantCategoryCode
  });
  const identity = getStableIdentity({
    accountId,
    providerInternalTransactionId,
    providerTransactionId,
    entryReference,
    endToEndId,
    deduplicationFingerprint
  });

  return {
    user_id: userId,
    account_id: accountId,
    stable_import_key: identity.key,
    identity_source: identity.source,
    provider: ENABLE_BANKING_PROVIDER,
    provider_transaction_id: providerTransactionId,
    provider_internal_transaction_id: providerInternalTransactionId,
    entry_reference: entryReference,
    end_to_end_id: endToEndId,
    deduplication_fingerprint: deduplicationFingerprint,
    booking_status: getBookingStatus(transaction),
    booking_date: getDate(
      transaction.booking_date ?? transaction.booking_date_time
    ),
    booking_datetime: getDateTime(transaction.booking_date_time),
    value_date: getDate(transaction.value_date ?? transaction.value_date_time),
    value_datetime: getDateTime(transaction.value_date_time),
    amount: amount.amount,
    currency: amount.currency,
    description,
    merchant_name: merchantName,
    counterparty_name: counterpartyName,
    counterparty_account_last4: counterpartyAccountLast4,
    bank_transaction_code: bankTransactionCode,
    merchant_category_code: merchantCategoryCode
  };
}

function mapStoredTransactionToSummary(
  row: StoredMonthlyTransactionRow
): MonthlyTransactionSummary {
  const account = Array.isArray(row.accounts)
    ? (row.accounts[0] ?? null)
    : row.accounts;
  const bankConnection = Array.isArray(account?.bank_connections)
    ? (account.bank_connections[0] ?? null)
    : account?.bank_connections;
  const institution = Array.isArray(bankConnection?.institutions)
    ? (bankConnection.institutions[0] ?? null)
    : bankConnection?.institutions;
  const institutionName = institution?.name ?? "Cuenta";
  const institutionProviderId = institution?.provider_institution_id ?? null;

  return {
    id: row.id,
    institution_slug: getInstitutionSlug(
      institutionProviderId ?? institutionName
    ),
    institution_name: institutionName,
    institution_provider_id: institutionProviderId,
    account_id: row.account_id,
    account_name: account?.name ?? "Cuenta",
    account_iban_last4: account?.iban_last4 ?? null,
    booking_status: row.booking_status,
    booking_date: row.booking_date,
    amount: String(row.amount),
    currency: row.currency,
    description: row.description,
    merchant_name: row.merchant_name,
    counterparty_name: row.counterparty_name
  };
}

function getTransactionAmount(
  transaction: EnableBankingTransactionResource
): { amount: string; currency: string } | null {
  const value = transaction.transaction_amount ?? transaction.amount;
  const rawAmount = getTextValue(value?.amount);
  const currency = getTextValue(value?.currency)?.toUpperCase();

  if (!rawAmount || !currency || !/^[A-Z]{3}$/.test(currency)) {
    return null;
  }

  return {
    amount: applyCreditDebitSign(rawAmount, transaction.credit_debit_indicator),
    currency
  };
}

function applyCreditDebitSign(amount: string, indicator: unknown) {
  const normalized = amount.trim();
  const absolute = normalized.replace(/^[+-]/, "");
  const normalizedIndicator = normalizeText(indicator).toUpperCase();

  if (normalizedIndicator.includes("DBIT") || normalizedIndicator === "DEBIT") {
    return `-${absolute}`;
  }

  if (
    normalizedIndicator.includes("CRDT") ||
    normalizedIndicator === "CREDIT"
  ) {
    return absolute;
  }

  return normalized;
}

function getBookingStatus(
  transaction: EnableBankingTransactionResource
): "booked" | "pending" | "information" {
  const status = normalizeText(transaction.booking_status ?? transaction.status)
    .toLowerCase()
    .replace(/_/g, "-");

  if (status.includes("pending")) {
    return "pending";
  }

  if (status.includes("information") || status.includes("info")) {
    return "information";
  }

  return "booked";
}

function getDescription(
  transaction: EnableBankingTransactionResource
): string | null {
  const remittance = transaction.remittance_information_unstructured;

  if (Array.isArray(remittance) && remittance.length > 0) {
    return getTextValue(remittance);
  }

  const unstructured = getTextValue(remittance);

  if (unstructured) {
    return unstructured;
  }

  if (transaction.remittance_information?.length) {
    return getTextValue(transaction.remittance_information);
  }

  return getTextValue(transaction.description);
}

function getCounterpartyName(
  transaction: EnableBankingTransactionResource
): string | null {
  return (
    getTextValue(transaction.counterparty_name) ??
    getTextValue(transaction.creditor_name) ??
    getTextValue(transaction.debtor_name) ??
    null
  );
}

function getCounterpartyAccountLast4(
  transaction: EnableBankingTransactionResource
): string | null {
  return (
    getLast4(transaction.creditor_account?.iban) ??
    getLast4(transaction.debtor_account?.iban) ??
    getLast4(transaction.creditor_account?.other?.identification) ??
    getLast4(transaction.debtor_account?.other?.identification)
  );
}

function getStableIdentity({
  accountId,
  providerInternalTransactionId,
  providerTransactionId,
  entryReference,
  endToEndId,
  deduplicationFingerprint
}: {
  accountId: string;
  providerInternalTransactionId: string | null;
  providerTransactionId: string | null;
  entryReference: string | null;
  endToEndId: string | null;
  deduplicationFingerprint: string;
}) {
  if (providerInternalTransactionId) {
    return {
      source: "provider_internal_transaction_id",
      key: `provider_internal:${accountId}:${providerInternalTransactionId}`
    };
  }

  if (providerTransactionId) {
    return {
      source: "provider_transaction_id",
      key: `provider_transaction:${accountId}:${providerTransactionId}`
    };
  }

  if (entryReference) {
    return {
      source: "entry_reference",
      key: `entry_reference:${accountId}:${entryReference}`
    };
  }

  if (endToEndId && !isMeaninglessIdentifier(endToEndId)) {
    return {
      source: "end_to_end_id",
      key: `end_to_end:${accountId}:${endToEndId}`
    };
  }

  return {
    source: "deduplication_fingerprint",
    key: `fingerprint:${accountId}:${deduplicationFingerprint}`
  };
}

function getDeduplicationFingerprint(input: {
  accountId: string;
  bookingDate: string | null;
  valueDate: string | null;
  amount: string;
  currency: string;
  description: string | null;
  counterpartyName: string | null;
  merchantName: string | null;
  counterpartyAccountLast4: string | null;
  bankTransactionCode: string | null;
  merchantCategoryCode: string | null;
}): string {
  return createHash("sha256")
    .update(
      [
        input.accountId,
        input.bookingDate ?? "",
        input.valueDate ?? "",
        normalizeText(input.amount),
        input.currency,
        normalizeText(input.description),
        normalizeText(input.counterpartyName),
        normalizeText(input.merchantName),
        input.counterpartyAccountLast4 ?? "",
        normalizeText(input.bankTransactionCode),
        normalizeText(input.merchantCategoryCode)
      ].join("|")
    )
    .digest("hex");
}

function getDate(value: unknown): string | null {
  const text = getTextValue(value);

  return text ? text.slice(0, 10) : null;
}

function getDateTime(value: unknown): string | null {
  const text = getTextValue(value);

  return text?.includes("T") ? text : null;
}

function getLast4(value: unknown): string | null {
  const normalized = getTextValue(value)?.replace(/[^A-Za-z0-9]/g, "");

  if (!normalized || normalized.length < 4) {
    return null;
  }

  return normalized.slice(-4);
}

function normalizeText(value: unknown): string {
  return (getTextValue(value) ?? "").replace(/\s+/g, " ").toLowerCase();
}

function getTextValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    const text = value
      .map((item) => getTextValue(item))
      .filter((item): item is string => Boolean(item))
      .join(" ")
      .trim();

    return text || null;
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function isMeaninglessIdentifier(value: string): boolean {
  const normalized = normalizeText(value).replace(/[^A-Za-z0-9]/g, "");

  return normalized.length === 0 || /^0+$/.test(normalized);
}

function getInstitutionSlug(
  institutionName: string
): MonthlyTransactionSummary["institution_slug"] {
  const normalized = institutionName.toLowerCase();

  if (normalized.includes("ing")) {
    return "ing";
  }

  if (
    normalized.includes("caixabank") ||
    normalized.includes("caixa bank") ||
    normalized.includes("la caixa")
  ) {
    return "caixabank";
  }

  return "unknown";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error.";
}
