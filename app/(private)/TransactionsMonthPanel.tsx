"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { TransactionMonthData } from "@/definitions";
import { getSelectedTransactionMonth } from "@/lib/domain/transactionRanges";
import { Button } from "@/components/ui/button";
import { MonthlyTransactionsPanel } from "./MonthlyTransactionsPanel";
import { requestTransactionMonth } from "./MonthlyTransactionsPanel/monthRequest";

export function TransactionsMonthPanel({
  initialData
}: {
  initialData: TransactionMonthData;
}) {
  const searchParams = useSearchParams();
  const month = getSelectedTransactionMonth(
    searchParams.get("month") ?? undefined
  );
  const [snapshot, setSnapshot] = useState({
    month: initialData.selectedMonth.value,
    data: initialData,
    error: initialData.error
  });
  const initialRef = useRef(initialData);
  const hasNavigatedRef = useRef(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (month.value === initialRef.current.selectedMonth.value && retry === 0)
      return;
    hasNavigatedRef.current = true;
    const controller = new AbortController();
    requestTransactionMonth(month.value, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setSnapshot({ month: month.value, data, error: null });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setSnapshot({
            month: month.value,
            data: initialRef.current,
            error:
              error instanceof Error
                ? error.message
                : "No se pudieron cargar los movimientos."
          });
      });
    return () => controller.abort();
  }, [month.value, retry]);
  const dataReady = snapshot.month === month.value && !snapshot.error;
  return (
    <>
      <MonthlyTransactionsPanel
        key={month.value + ":" + snapshot.data.loadedAt + ":" + retry}
        transactions={dataReady ? snapshot.data.rows : []}
        categoryGroups={dataReady ? snapshot.data.categoryGroups : []}
        labels={dataReady ? snapshot.data.labels : []}
        selectedMonth={month}
        error={snapshot.month === month.value ? snapshot.error : null}
        loading={snapshot.month !== month.value}
      />
      {snapshot.month === month.value && snapshot.error && (
        <Button
          variant="outline"
          onClick={() => {
            setSnapshot((value) => ({ ...value, month: "", error: null }));
            setRetry((value) => value + 1);
          }}
        >
          Reintentar
        </Button>
      )}
    </>
  );
}
