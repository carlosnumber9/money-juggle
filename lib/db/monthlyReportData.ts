import "server-only";

import type { MonthlyReportData, MonthlyTransactionRange } from "@/definitions";
import { getInternalTransferMatchingRange } from "@/lib/db/enableBankingTransactions/internalTransferMatchingRange";
import { getInternalTransferTransactionIds } from "@/lib/db/enableBankingTransactions/internalTransfers";
import { mapStoredTransactionToSummary } from "@/lib/db/enableBankingTransactions/mapStoredTransaction";
import { MONTHLY_TRANSACTION_SELECT } from "@/lib/db/enableBankingTransactions/transactionReadContext";
import type { StoredMonthlyTransactionRow } from "@/lib/db/enableBankingTransactions/types";
import { listTransactionReconciliationStates } from "@/lib/db/transactionReconciliations";
import { shiftReportDate } from "@/lib/reports/monthlyExport/period";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { readReportAdjustments } from "./monthlyReportData/adjustments";
import {
  readReportPages,
  REPORT_PAGE_SIZE
} from "./monthlyReportData/pagination";

export async function getMonthlyReportData(
  userId: string,
  range: MonthlyTransactionRange,
  client?: Awaited<ReturnType<typeof createSupabaseServerClient>>
): Promise<MonthlyReportData> {
  const supabase = client ?? (await createSupabaseServerClient());
  const [
    accounts,
    storedTransactions,
    balances,
    categoryGroups,
    adjustmentData
  ] = await Promise.all([
    readReportPages((offset) =>
      supabase
        .from("accounts")
        .select(
          "id,name,currency,status,iban_last4,iban_fingerprint,bank_connection_id,bank_connections(status,institutions(name))"
        )
        .eq("user_id", userId)
        .order("id")
        .range(offset, offset + REPORT_PAGE_SIZE - 1)
    ),
    readReportPages((offset) =>
      supabase
        .from("transactions")
        .select(MONTHLY_TRANSACTION_SELECT)
        .eq("user_id", userId)
        .eq("booking_status", "booked")
        .or(
          `and(reporting_date.gte.${range.from},reporting_date.lt.${range.to}),and(booking_date.gte.${range.from},booking_date.lt.${range.to})`
        )
        .order("id")
        .range(offset, offset + REPORT_PAGE_SIZE - 1)
    ),
    readReportPages((offset) =>
      supabase
        .from("balances")
        .select(
          "id,account_id,balance_type,amount,currency,reference_date,fetched_at"
        )
        .eq("user_id", userId)
        .in("balance_type", ["CLBD", "CLAV", "ITBD", "ITAV", "OPBD", "OPAV"])
        .or(
          `and(reference_date.gte.${range.from},reference_date.lt.${range.to}),and(reference_date.is.null,fetched_at.gte.${shiftReportDate(range.from, -1)}T00:00:00Z,fetched_at.lt.${shiftReportDate(range.to, 1)}T00:00:00Z)`
        )
        .order("id")
        .range(offset, offset + REPORT_PAGE_SIZE - 1)
    ),
    readReportPages((offset) =>
      supabase
        .from("transaction_category_groups")
        .select("id,name,slug")
        .eq("user_id", userId)
        .order("id")
        .range(offset, offset + REPORT_PAGE_SIZE - 1)
    ),
    readReportAdjustments(userId, range, supabase)
  ]);

  const rows = storedTransactions as unknown as StoredMonthlyTransactionRow[];
  const matchingRange = getInternalTransferMatchingRange(rows);
  const [matchingRows, states] = await Promise.all([
    matchingRange
      ? readReportPages((offset) =>
          supabase
            .from("transactions")
            .select(MONTHLY_TRANSACTION_SELECT)
            .eq("user_id", userId)
            .eq("booking_status", "booked")
            .gte("booking_date", matchingRange.from)
            .lt("booking_date", matchingRange.to)
            .order("id")
            .range(offset, offset + REPORT_PAGE_SIZE - 1)
        )
      : [],
    listTransactionReconciliationStates(
      {
        userId,
        transactionIds: rows.map((row) => row.id)
      },
      supabase
    )
  ]);
  const merged = new Map(rows.map((row) => [row.id, row]));
  for (const row of matchingRows as unknown as StoredMonthlyTransactionRow[])
    merged.set(row.id, row);
  const internalIds = getInternalTransferTransactionIds(
    [...merged.values()],
    accounts
  );
  const connectionIds = [
    ...new Set(accounts.map((account) => account.bank_connection_id))
  ];
  const syncs: MonthlyReportData["syncs"] = [];
  for (const connectionId of connectionIds) {
    const { data, error } = await supabase
      .from("sync_runs")
      .select("finished_at,status")
      .eq("user_id", userId)
      .eq("bank_connection_id", connectionId)
      .order("started_at", { ascending: false })
      .limit(1);
    if (error)
      throw new Error(`Could not load report sync status: ${error.message}`);
    syncs.push({
      connectionId,
      finishedAt: data?.[0]?.finished_at ?? null,
      status: data?.[0]?.status ?? "unknown"
    });
  }
  return {
    accounts: accounts.map((account) => {
      const connection = Array.isArray(account.bank_connections)
        ? account.bank_connections[0]
        : account.bank_connections;
      const institution = Array.isArray(connection?.institutions)
        ? connection.institutions[0]
        : connection?.institutions;
      const institutionName = institution?.name ?? "Entidad no disponible";
      return {
        id: account.id,
        name: `${account.name}${account.iban_last4 ? ` · •••• ${account.iban_last4}` : ""}`,
        institution: institutionName,
        currency: account.currency,
        status: account.status,
        connectionId: account.bank_connection_id
      };
    }),
    transactions: rows.map((row) =>
      mapStoredTransactionToSummary(
        row,
        internalIds.has(row.id) ? "internal_transfer" : "external",
        states.get(row.id) ?? null
      )
    ),
    balances: balances.map((balance) => ({
      ...balance,
      amount: String(balance.amount)
    })),
    categoryGroups: categoryGroups.map((group) => ({
      ...group,
      categories: []
    })),
    syncs,
    ...adjustmentData
  };
}
