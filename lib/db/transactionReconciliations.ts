import "server-only";

import type {
  SaveTransactionReconciliationInput,
  SaveTransactionReconciliationResult,
  TransactionReconciliationCandidate,
  TransactionReconciliationCandidateCursor,
  TransactionReconciliationCandidatePage,
  TransactionReconciliationDetail,
  TransactionReconciliationDifferenceTreatment,
  TransactionReconciliationKind,
  TransactionReconciliationMembership,
  TransactionReconciliationAdjustment,
  MonthlyTransactionRange
} from "@/definitions";
import { sumDecimals } from "@/lib/domain/decimal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { getInternalTransferTransactionIds } from "./enableBankingTransactions/internalTransfers";
import {
  listOwnAccountsForTransferMatching,
  MONTHLY_TRANSACTION_SELECT
} from "./enableBankingTransactions/transactionReadContext";
import { mapStoredTransactionToSummary } from "./enableBankingTransactions/mapStoredTransaction";
import type { StoredMonthlyTransactionRow } from "./enableBankingTransactions/types";

const CANDIDATE_PAGE_SIZE = 50;
const MATCHING_DAY_DISTANCE = 3;

type StoredAdjustmentGroup = {
  id: string;
  currency: string;
  adjustment_reporting_date: string;
  transaction_categories:
    | {
        id: string;
        name: string;
        slug: string;
        transaction_category_groups:
          | { id: string; name: string }
          | Array<{ id: string; name: string }>
          | null;
      }
    | Array<{
        id: string;
        name: string;
        slug: string;
        transaction_category_groups:
          | { id: string; name: string }
          | Array<{ id: string; name: string }>
          | null;
      }>
    | null;
  transaction_reconciliation_label_assignments: Array<{
    transaction_labels:
      { id: string; name: string } | Array<{ id: string; name: string }> | null;
  }>;
};

type StoredCandidateRow = {
  id: string;
  account_id: string;
  booking_status: TransactionReconciliationCandidate["bookingStatus"];
  booking_date: string | null;
  reporting_date: string | null;
  amount: string | number;
  currency: string;
  description: string | null;
  merchant_name: string | null;
  counterparty_name: string | null;
  counterparty_account_last4: string | null;
  account_name: string;
  account_iban_last4: string | null;
  institution_name: string;
  institution_provider_id: string | null;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  category_group_id: string | null;
  category_group_name: string | null;
  labels: unknown;
  is_existing_member: boolean;
};

type StoredReconciliationRow = {
  id: string;
  kind: TransactionReconciliationKind;
  note: string | null;
  currency: string;
  difference_treatment: TransactionReconciliationDifferenceTreatment;
  adjustment_category_id: string | null;
  adjustment_reporting_date: string | null;
};

export async function listTransactionReconciliationStates({
  userId,
  transactionIds
}: {
  userId: string;
  transactionIds: string[];
}): Promise<Map<string, TransactionReconciliationMembership>> {
  if (transactionIds.length === 0) {
    return new Map();
  }

  const supabase = await createSupabaseServerClient();
  const { data: memberships, error: membershipError } = await supabase
    .from("transaction_reconciliation_items")
    .select("transaction_id, reconciliation_id")
    .eq("user_id", userId)
    .in("transaction_id", transactionIds);

  if (membershipError) {
    throw new Error(
      `Could not list transaction reconciliations: ${membershipError.message}`
    );
  }

  const reconciliationIds = [
    ...new Set((memberships ?? []).map((item) => item.reconciliation_id))
  ];

  if (reconciliationIds.length === 0) {
    return new Map();
  }

  const [
    { data: groups, error: groupError },
    { data: items, error: itemError }
  ] = await Promise.all([
    supabase
      .from("transaction_reconciliations")
      .select("id, difference_treatment")
      .eq("user_id", userId)
      .in("id", reconciliationIds),
    supabase
      .from("transaction_reconciliation_items")
      .select("reconciliation_id, transactions (amount)")
      .eq("user_id", userId)
      .in("reconciliation_id", reconciliationIds)
  ]);

  if (groupError || itemError) {
    throw new Error(
      `Could not load reconciliation state: ${groupError?.message ?? itemError?.message}`
    );
  }

  const balanceByReconciliation = new Map<string, string[]>();

  for (const item of items ?? []) {
    const transaction = Array.isArray(item.transactions)
      ? item.transactions[0]
      : item.transactions;

    if (!transaction) {
      continue;
    }

    balanceByReconciliation.set(item.reconciliation_id, [
      ...(balanceByReconciliation.get(item.reconciliation_id) ?? []),
      String(transaction.amount)
    ]);
  }

  const groupById = new Map(
    (groups ?? []).map((group) => [group.id, group.difference_treatment])
  );

  return new Map(
    (memberships ?? []).flatMap((membership) => {
      const differenceTreatment = groupById.get(
        membership.reconciliation_id
      ) as TransactionReconciliationDifferenceTreatment | undefined;

      if (!differenceTreatment) {
        return [];
      }

      const balance = sumDecimals(
        balanceByReconciliation.get(membership.reconciliation_id) ?? []
      );

      return [
        [
          membership.transaction_id,
          {
            id: membership.reconciliation_id,
            differenceTreatment,
            requiresReview: differenceTreatment === "none" && balance !== "0"
          }
        ] as const
      ];
    })
  );
}

export async function listTransactionReconciliationAdjustments({
  userId,
  range
}: {
  userId: string;
  range: MonthlyTransactionRange;
}): Promise<TransactionReconciliationAdjustment[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transaction_reconciliations")
    .select(
      `
      id,
      currency,
      adjustment_reporting_date,
      transaction_categories (
        id,
        name,
        slug,
        transaction_category_groups (id, name)
      ),
      transaction_reconciliation_label_assignments (
        transaction_labels (id, name)
      )
    `
    )
    .eq("user_id", userId)
    .eq("difference_treatment", "reportable")
    .gte("adjustment_reporting_date", range.from)
    .lt("adjustment_reporting_date", range.to);

  if (error) {
    throw new Error(
      `Could not list reconciliation adjustments: ${error.message}`
    );
  }

  const groups = (data ?? []) as StoredAdjustmentGroup[];

  if (groups.length === 0) {
    return [];
  }

  const { data: items, error: itemError } = await supabase
    .from("transaction_reconciliation_items")
    .select("reconciliation_id, transactions (amount)")
    .eq("user_id", userId)
    .in(
      "reconciliation_id",
      groups.map((group) => group.id)
    );

  if (itemError) {
    throw new Error(
      `Could not calculate reconciliation adjustments: ${itemError.message}`
    );
  }

  const amountsByGroup = new Map<string, string[]>();

  for (const item of items ?? []) {
    const transaction = Array.isArray(item.transactions)
      ? item.transactions[0]
      : item.transactions;

    if (transaction) {
      amountsByGroup.set(item.reconciliation_id, [
        ...(amountsByGroup.get(item.reconciliation_id) ?? []),
        String(transaction.amount)
      ]);
    }
  }

  return groups.flatMap((group) => {
    const amount = sumDecimals(amountsByGroup.get(group.id) ?? []);
    const category = Array.isArray(group.transaction_categories)
      ? group.transaction_categories[0]
      : group.transaction_categories;
    const categoryGroup = Array.isArray(category?.transaction_category_groups)
      ? category.transaction_category_groups[0]
      : category?.transaction_category_groups;

    if (
      amount === "0" ||
      !group.adjustment_reporting_date ||
      !category ||
      !categoryGroup
    ) {
      return [];
    }

    return [
      {
        reconciliationId: group.id,
        reportingDate: group.adjustment_reporting_date,
        amount,
        currency: group.currency,
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          group: { id: categoryGroup.id, name: categoryGroup.name }
        },
        labels: group.transaction_reconciliation_label_assignments
          .map((assignment) =>
            Array.isArray(assignment.transaction_labels)
              ? assignment.transaction_labels[0]
              : assignment.transaction_labels
          )
          .filter((label): label is { id: string; name: string } =>
            Boolean(label)
          )
      }
    ];
  });
}

export async function searchTransactionReconciliationCandidates({
  userId,
  currency,
  query,
  cursor,
  reconciliationId
}: {
  userId: string;
  currency: string;
  query: string;
  cursor: TransactionReconciliationCandidateCursor | null;
  reconciliationId: string | null;
}): Promise<TransactionReconciliationCandidatePage> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    "search_transaction_reconciliation_candidates",
    {
      p_currency: currency,
      p_query: query,
      p_before_reporting_date: cursor?.reportingDate ?? null,
      p_before_id: cursor?.id ?? null,
      p_limit: CANDIDATE_PAGE_SIZE,
      p_reconciliation_id: reconciliationId
    }
  );

  if (error) {
    throw new Error(
      `Could not search reconciliation candidates: ${error.message}`
    );
  }

  const storedRows = (data ?? []) as StoredCandidateRow[];
  const internalTransferIds = await getInternalTransferIdsForCandidateRows({
    userId,
    rows: storedRows
  });
  const rows = storedRows
    .map((row) =>
      mapStoredCandidate(
        row,
        internalTransferIds.has(row.id),
        row.is_existing_member
      )
    )
    .filter((row) => row.isExistingMember || !row.isInternalTransfer);
  const lastStoredRow = storedRows.at(-1);

  return {
    rows,
    nextCursor:
      storedRows.length === CANDIDATE_PAGE_SIZE && lastStoredRow
        ? {
            reportingDate: lastStoredRow.reporting_date ?? "0001-01-01",
            id: lastStoredRow.id
          }
        : null
  };
}

export async function getTransactionReconciliationDetail({
  userId,
  reconciliationId
}: {
  userId: string;
  reconciliationId: string;
}): Promise<TransactionReconciliationDetail> {
  const supabase = await createSupabaseServerClient();
  const [
    { data: reconciliation, error: reconciliationError },
    itemsResult,
    labelsResult
  ] = await Promise.all([
    supabase
      .from("transaction_reconciliations")
      .select(
        "id, kind, note, currency, difference_treatment, adjustment_category_id, adjustment_reporting_date"
      )
      .eq("id", reconciliationId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("transaction_reconciliation_items")
      .select("transaction_id, position")
      .eq("reconciliation_id", reconciliationId)
      .eq("user_id", userId)
      .order("position", { ascending: true }),
    supabase
      .from("transaction_reconciliation_label_assignments")
      .select("transaction_labels (id, name)")
      .eq("reconciliation_id", reconciliationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
  ]);

  if (reconciliationError || !reconciliation) {
    throw new Error(
      `Could not load reconciliation: ${reconciliationError?.message ?? "not found"}`
    );
  }

  if (itemsResult.error) {
    throw new Error(
      `Could not load reconciliation members: ${itemsResult.error.message}`
    );
  }

  if (labelsResult.error) {
    throw new Error(
      `Could not load reconciliation labels: ${labelsResult.error.message}`
    );
  }

  const itemRows = (itemsResult.data ?? []) as Array<{
    transaction_id: string;
    position: number;
  }>;
  const transactionRows = await listTransactionRowsByIds(
    userId,
    itemRows.map((item) => item.transaction_id)
  );
  const internalTransferIds = await getInternalTransferIdsForTransactionRows({
    userId,
    rows: transactionRows
  });
  const rowsById = new Map(transactionRows.map((row) => [row.id, row]));
  const members = itemRows
    .map((item) => rowsById.get(item.transaction_id))
    .filter((row): row is StoredMonthlyTransactionRow => Boolean(row))
    .map((row) =>
      mapSummaryCandidate(
        mapStoredTransactionToSummary(row),
        internalTransferIds.has(row.id),
        true
      )
    );
  const currentBalance = sumDecimals(members.map((member) => member.amount));
  const stored = reconciliation as StoredReconciliationRow;

  return {
    id: stored.id,
    kind: stored.kind,
    note: stored.note,
    currency: stored.currency,
    differenceTreatment: stored.difference_treatment,
    adjustmentCategoryId: stored.adjustment_category_id,
    adjustmentReportingDate: stored.adjustment_reporting_date,
    adjustmentLabels: (labelsResult.data ?? [])
      .map((assignment) => {
        const label = Array.isArray(assignment.transaction_labels)
          ? assignment.transaction_labels[0]
          : assignment.transaction_labels;

        return label ? { id: label.id, name: label.name } : null;
      })
      .filter((label): label is { id: string; name: string } => Boolean(label)),
    members,
    currentBalance,
    requiresReview:
      stored.difference_treatment === "none" && currentBalance !== "0"
  };
}

export async function saveTransactionReconciliation(
  input: SaveTransactionReconciliationInput & { userId: string }
): Promise<SaveTransactionReconciliationResult> {
  const existingMemberIds = input.reconciliationId
    ? await listReconciliationMemberIds(input.userId, input.reconciliationId)
    : new Set<string>();
  const transactionRows = await listTransactionRowsByIds(
    input.userId,
    input.transactionIds
  );
  const internalTransferIds = await getInternalTransferIdsForTransactionRows({
    userId: input.userId,
    rows: transactionRows
  });
  const invalidNewInternalTransfer = input.transactionIds.find(
    (transactionId) =>
      !existingMemberIds.has(transactionId) &&
      internalTransferIds.has(transactionId)
  );

  if (invalidNewInternalTransfer) {
    throw new Error(
      "An internal transfer cannot be added to a reconciliation."
    );
  }

  const supabase = await createSupabaseServerClient();
  const reportableDifference =
    input.difference.treatment === "reportable" ? input.difference : null;
  const { data, error } = await supabase.rpc(
    "save_transaction_reconciliation",
    {
      p_reconciliation_id: input.reconciliationId,
      p_kind: input.kind,
      p_note: input.note,
      p_transaction_ids: input.transactionIds,
      p_expected_balance: input.expectedBalance,
      p_difference_treatment: input.difference.treatment,
      p_adjustment_category_id: reportableDifference?.categoryId ?? null,
      p_adjustment_reporting_date: reportableDifference?.reportingDate ?? null,
      p_label_ids: reportableDifference?.labelIds ?? [],
      p_new_label_names: reportableDifference?.newLabelNames ?? []
    }
  );

  if (error) {
    throw new Error(`Could not save reconciliation: ${error.message}`);
  }

  const saved = (data ?? [])[0] as
    | { saved_reconciliation_id: string; current_balance: string | number }
    | undefined;

  if (!saved) {
    throw new Error("Could not save reconciliation: no result returned.");
  }

  return {
    reconciliationId: saved.saved_reconciliation_id,
    currentBalance: String(saved.current_balance)
  };
}

export async function deleteTransactionReconciliation({
  reconciliationId
}: {
  reconciliationId: string;
}): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    "delete_transaction_reconciliation",
    { p_reconciliation_id: reconciliationId }
  );

  if (error || data !== true) {
    throw new Error(
      `Could not delete reconciliation: ${error?.message ?? "not found"}`
    );
  }
}

async function listReconciliationMemberIds(
  userId: string,
  reconciliationId: string
): Promise<Set<string>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transaction_reconciliation_items")
    .select("transaction_id")
    .eq("user_id", userId)
    .eq("reconciliation_id", reconciliationId);

  if (error) {
    throw new Error(`Could not list reconciliation members: ${error.message}`);
  }

  return new Set((data ?? []).map((item) => item.transaction_id));
}

async function listTransactionRowsByIds(
  userId: string,
  transactionIds: string[]
): Promise<StoredMonthlyTransactionRow[]> {
  if (transactionIds.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(MONTHLY_TRANSACTION_SELECT)
    .eq("user_id", userId)
    .in("id", transactionIds);

  if (error) {
    throw new Error(
      `Could not list reconciliation transactions: ${error.message}`
    );
  }

  return (data ?? []) as StoredMonthlyTransactionRow[];
}

async function getInternalTransferIdsForCandidateRows({
  userId,
  rows
}: {
  userId: string;
  rows: StoredCandidateRow[];
}): Promise<Set<string>> {
  const dates = rows
    .map((row) => row.booking_date)
    .filter((date): date is string => Boolean(date));

  if (dates.length === 0) {
    return new Set();
  }

  const sortedDates = dates.sort();
  const contextRows = await listTransactionRowsByBookingDate({
    userId,
    from: shiftDate(sortedDates[0], -MATCHING_DAY_DISTANCE),
    to: shiftDate(sortedDates.at(-1)!, MATCHING_DAY_DISTANCE + 1)
  });

  return getInternalTransferIdsForTransactionRows({
    userId,
    rows: contextRows
  });
}

async function getInternalTransferIdsForTransactionRows({
  userId,
  rows
}: {
  userId: string;
  rows: StoredMonthlyTransactionRow[];
}): Promise<Set<string>> {
  const dates = rows
    .map((row) => row.booking_date)
    .filter((date): date is string => Boolean(date));

  if (dates.length === 0) {
    return new Set();
  }

  const sortedDates = dates.sort();
  const contextRows = await listTransactionRowsByBookingDate({
    userId,
    from: shiftDate(sortedDates[0], -MATCHING_DAY_DISTANCE),
    to: shiftDate(sortedDates.at(-1)!, MATCHING_DAY_DISTANCE + 1)
  });
  const ownAccounts = await listOwnAccountsForTransferMatching(userId);

  return getInternalTransferTransactionIds(contextRows, ownAccounts);
}

async function listTransactionRowsByBookingDate({
  userId,
  from,
  to
}: {
  userId: string;
  from: string;
  to: string;
}): Promise<StoredMonthlyTransactionRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(MONTHLY_TRANSACTION_SELECT)
    .eq("user_id", userId)
    .gte("booking_date", from)
    .lt("booking_date", to);

  if (error) {
    throw new Error(
      `Could not load transfer matching context: ${error.message}`
    );
  }

  return (data ?? []) as StoredMonthlyTransactionRow[];
}

function mapStoredCandidate(
  row: StoredCandidateRow,
  isInternalTransfer: boolean,
  isExistingMember: boolean
): TransactionReconciliationCandidate {
  return {
    id: row.id,
    accountId: row.account_id,
    accountName: row.account_name,
    accountIbanLast4: row.account_iban_last4,
    institutionName: row.institution_name,
    institutionProviderId: row.institution_provider_id,
    bookingStatus: row.booking_status,
    bookingDate: row.booking_date,
    reportingDate: row.reporting_date,
    amount: String(row.amount),
    currency: row.currency,
    description: row.description,
    merchantName: row.merchant_name,
    counterpartyName: row.counterparty_name,
    counterpartyAccountLast4: row.counterparty_account_last4,
    category:
      row.category_id &&
      row.category_name &&
      row.category_slug &&
      row.category_group_id &&
      row.category_group_name
        ? {
            id: row.category_id,
            name: row.category_name,
            slug: row.category_slug,
            group: {
              id: row.category_group_id,
              name: row.category_group_name
            }
          }
        : null,
    labels: parseStoredLabels(row.labels),
    isExistingMember,
    isInternalTransfer
  };
}

function mapSummaryCandidate(
  transaction: ReturnType<typeof mapStoredTransactionToSummary>,
  isInternalTransfer: boolean,
  isExistingMember: boolean
): TransactionReconciliationCandidate {
  return {
    id: transaction.id,
    accountId: transaction.account_id,
    accountName: transaction.account_name,
    accountIbanLast4: transaction.account_iban_last4,
    institutionName: transaction.institution_name,
    institutionProviderId: transaction.institution_provider_id,
    bookingStatus: transaction.booking_status,
    bookingDate: transaction.booking_date,
    reportingDate: transaction.reporting_date,
    amount: transaction.amount,
    currency: transaction.currency,
    description: transaction.description,
    merchantName: transaction.merchant_name,
    counterpartyName: transaction.counterparty_name,
    counterpartyAccountLast4: null,
    category: transaction.category,
    labels: transaction.labels,
    isExistingMember,
    isInternalTransfer
  };
}

function parseStoredLabels(
  value: unknown
): Array<{ id: string; name: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (label): label is { id: string; name: string } =>
      typeof label === "object" &&
      label !== null &&
      typeof (label as { id?: unknown }).id === "string" &&
      typeof (label as { name?: unknown }).name === "string"
  );
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
