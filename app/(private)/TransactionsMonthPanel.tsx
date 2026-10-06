"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import type { TransactionMonthData } from "@/definitions";
import { getSelectedTransactionMonth } from "@/lib/domain/transactionRanges";
import { Button } from "@/components/ui/button";
import { MonthlyTransactionsPanel } from "./MonthlyTransactionsPanel";
import {
  MonthRequestError,
  requestTransactionMonth
} from "./MonthlyTransactionsPanel/monthRequest";
import {
  monthKey,
  patchMonthRows
} from "./MonthlyTransactionsPanel/monthCache";
import { usePrivateQuerySession } from "./PrivateQueryProvider";

const EMPTY_ROWS: TransactionMonthData["rows"] = [];
const EMPTY_CATEGORIES: TransactionMonthData["categoryGroups"] = [];
const EMPTY_LABELS: TransactionMonthData["labels"] = [];

export function TransactionsMonthPanel({
  initialData
}: {
  initialData: TransactionMonthData;
}) {
  const searchParams = useSearchParams();
  const month = getSelectedTransactionMonth(
    searchParams.get("month") ?? undefined
  );
  const client = useQueryClient();
  const { userId, rejectAccess } = usePrivateQuerySession();
  const query = useQuery({
    queryKey: monthKey(userId, month.value),
    queryFn: async ({ signal }) => {
      try {
        return await requestTransactionMonth(month.value, signal);
      } catch (error) {
        if (error instanceof MonthRequestError) rejectAccess(error.status);
        throw error;
      }
    },
    initialData:
      month.value === initialData.selectedMonth.value && !initialData.error
        ? initialData
        : undefined,
    initialDataUpdatedAt: initialData.loadedAt
  });
  const [selection, setSelection] = useState({
    month: month.value,
    waiting: query.isFetching
  });
  const waiting =
    selection.month === month.value ? selection.waiting : query.isFetching;
  if (selection.month !== month.value)
    setSelection({ month: month.value, waiting: query.isFetching });
  else if (selection.waiting && !query.isFetching)
    setSelection({ month: month.value, waiting: false });
  const loading = !query.isError && (query.isPending || waiting);
  const dataReady = Boolean(
    query.data && query.data.selectedMonth.value === month.value && !loading
  );
  const error = query.error instanceof Error ? query.error.message : null;
  return (
    <>
      <MonthlyTransactionsPanel
        transactions={dataReady ? query.data!.rows : EMPTY_ROWS}
        categoryGroups={
          dataReady ? query.data!.categoryGroups : EMPTY_CATEGORIES
        }
        labels={dataReady ? query.data!.labels : EMPTY_LABELS}
        selectedMonth={month}
        error={error}
        loading={loading}
        onTransactionsChange={(update) => {
          void patchMonthRows(client, userId, month.value, update);
        }}
        onLabelAdd={(label) => {
          void client.cancelQueries({ queryKey: monthKey(userId) }).then(() => {
            client.setQueriesData<TransactionMonthData>(
              { queryKey: monthKey(userId) },
              (data) =>
                data && !data.labels.some((item) => item.id === label.id)
                  ? {
                      ...data,
                      labels: [...data.labels, label].sort((a, b) =>
                        a.name.localeCompare(b.name, "es")
                      )
                    }
                  : data
            );
          });
        }}
      />
      {query.isError && (
        <Button variant="outline" onClick={() => void query.refetch()}>
          Reintentar
        </Button>
      )}
    </>
  );
}
