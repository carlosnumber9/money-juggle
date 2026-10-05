"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { DashboardSyncControlsProps, SyncResponse } from "@/definitions";
import {
  getSyncNotices,
  NETWORK_SYNC_FAILURE,
  resolveTransactionFeedback
} from "./DashboardSyncControls/feedback";
import { requestSync } from "./DashboardSyncControls/requests";

import { useSyncActivity } from "./SyncActivityProvider";
import { MonthlyExportButton } from "./MonthlyExport/MonthlyExportButton";

type ActiveOperation = "refresh" | "backfill" | null;

export function DashboardSyncControls({
  enabled,
  backfill,
  exportPeriod
}: DashboardSyncControlsProps) {
  const router = useRouter();
  const { beginSync } = useSyncActivity();
  const didAutoRefreshRef = useRef(false);
  const [activeOperation, setActiveOperation] = useState<ActiveOperation>(null);
  const [refreshResult, setRefreshResult] = useState<SyncResponse | null>(null);
  const [backfillResult, setBackfillResult] = useState<SyncResponse | null>(
    null
  );

  useEffect(() => {
    if (!enabled || didAutoRefreshRef.current) {
      return;
    }

    didAutoRefreshRef.current = true;
    const abortController = new AbortController();
    const finishSync = beginSync();

    setActiveOperation("refresh");
    requestSync("/api/sync/dashboard", abortController.signal)
      .then((result) => {
        setRefreshResult(result);

        router.refresh();
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return;
        }

        console.error("No se pudieron actualizar los datos.", error);
        setRefreshResult(NETWORK_SYNC_FAILURE);
        router.refresh();
      })
      .finally(() => {
        finishSync();
        if (!abortController.signal.aborted) {
          setActiveOperation(null);
        }
      });

    return () => {
      abortController.abort();
      finishSync();
    };
  }, [beginSync, enabled, router]);

  async function handleRefresh() {
    if (!enabled || activeOperation) {
      return;
    }

    setActiveOperation("refresh");
    setRefreshResult(null);
    const finishSync = beginSync();

    try {
      const result = await requestSync("/api/sync/dashboard?force=true");

      setRefreshResult(result);
      router.refresh();
    } catch (error) {
      console.error("No se pudieron actualizar los datos.", error);
      setRefreshResult(NETWORK_SYNC_FAILURE);
      router.refresh();
    } finally {
      finishSync();
      setActiveOperation(null);
    }
  }

  async function handleBackfill() {
    if (backfill.status !== "available" || activeOperation) {
      return;
    }

    setActiveOperation("backfill");
    setBackfillResult(null);
    const finishSync = beginSync();

    try {
      const result = await requestSync("/api/sync/transactions/backfill");

      setBackfillResult(result);
      setRefreshResult((previous) =>
        resolveTransactionFeedback(
          previous,
          result.completedTransactionBanks ?? []
        )
      );
      router.refresh();
    } catch (error) {
      console.error("No se pudo importar el historial de movimientos.", error);
      setBackfillResult(NETWORK_SYNC_FAILURE);
      router.refresh();
    } finally {
      finishSync();
      setActiveOperation(null);
    }
  }

  const isBusy = activeOperation !== null;
  const notices = [
    ...getSyncNotices(refreshResult, "refresh"),
    ...(backfill.status === "available"
      ? getSyncNotices(backfillResult, "backfill")
      : [])
  ];
  const shouldRetryRefresh = refreshResult?.hasErrors;
  const shouldRetryBackfill = backfillResult?.hasErrors;

  return (
    <div className="mt-6 flex flex-wrap justify-end gap-2">
      {notices.map((notice, index) => (
        <p
          key={`${notice.message}:${index}`}
          role={notice.tone === "error" ? "alert" : "status"}
          className={`basis-full text-right text-sm ${notice.tone === "error" ? "text-destructive" : notice.tone === "warning" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}
        >
          {notice.message}
        </p>
      ))}
      <MonthlyExportButton
        defaultMonth={exportPeriod.defaultMonth}
        currentMonth={exportPeriod.currentMonth}
        disabled={isBusy}
      />
      {enabled ? (
        <Button
          type="button"
          size="sm"
          variant={shouldRetryRefresh ? "destructive" : "outline"}
          disabled={isBusy}
          onClick={handleRefresh}
        >
          {activeOperation === "refresh" ? (
            <>
              <Spinner aria-hidden />
              Actualizando
            </>
          ) : shouldRetryRefresh ? (
            "Reintentar actualización"
          ) : (
            "Actualizar"
          )}
        </Button>
      ) : null}
      {backfill.status === "available" ? (
        <Button
          type="button"
          size="sm"
          variant={shouldRetryBackfill ? "destructive" : "default"}
          disabled={isBusy}
          onClick={handleBackfill}
        >
          {activeOperation === "backfill" ? (
            <>
              <Spinner aria-hidden />
              Importando
            </>
          ) : shouldRetryBackfill ? (
            "Reintentar historial"
          ) : (
            "Importar historial"
          )}
        </Button>
      ) : null}
    </div>
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
