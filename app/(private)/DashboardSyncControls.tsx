"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type {
  DashboardProgressEvent,
  DashboardSyncControlsProps,
  SyncResponse
} from "@/definitions";
import {
  getSyncNotices,
  NETWORK_SYNC_FAILURE,
  resolveTransactionFeedback
} from "./DashboardSyncControls/feedback";
import {
  requestSync,
  SyncRequestError
} from "./DashboardSyncControls/requests";

import { useMonthInvalidation } from "./MonthlyTransactionsPanel/useMonthInvalidation";

import { useSyncActivity } from "./SyncActivityProvider";
import { MonthlyExportButton } from "./MonthlyExport/MonthlyExportButton";

import { LoadingSteps } from "@/components/LoadingSteps";
import { useInitialLoadReady } from "./InitialLoadProvider";
import { usePrivateQuerySession } from "./PrivateQueryProvider";
import {
  applyDashboardProgress,
  createDashboardProgress,
  failDashboardProgress,
  setViewProgress
} from "./loadingProgress";

type ActiveOperation = "refresh" | "backfill" | null;

export function DashboardSyncControls({
  enabled,
  backfill,
  exportPeriod
}: DashboardSyncControlsProps) {
  const router = useRouter();
  const initialReady = useInitialLoadReady();
  const { rejectAccess } = usePrivateQuerySession();
  const [viewPending, startViewTransition] = useTransition();
  const refreshRequested = useRef(false);
  const syncFinished = useRef<(() => void) | null>(null);
  const [progress, setProgress] = useState(createDashboardProgress);
  const [expanded, setExpanded] = useState(false);
  const { invalidate: invalidateMonths } = useMonthInvalidation();
  const { beginSync } = useSyncActivity();
  const didAutoRefreshRef = useRef(false);
  const [activeOperation, setActiveOperation] = useState<ActiveOperation>(null);
  const [refreshResult, setRefreshResult] = useState<SyncResponse | null>(null);
  const [backfillResult, setBackfillResult] = useState<SyncResponse | null>(
    null
  );

  const operationRef = useRef<ActiveOperation>(null);
  const operationAbort = useRef<AbortController | null>(null);

  const refresh = useCallback(
    async (force: boolean) => {
      if (!enabled || operationRef.current) return;
      operationRef.current = "refresh";
      const abortController = new AbortController();
      operationAbort.current = abortController;
      const finishSync = beginSync();
      syncFinished.current = finishSync;
      setActiveOperation("refresh");
      setRefreshResult(null);
      setProgress(createDashboardProgress());
      setExpanded(true);
      let waitingForView = false;
      try {
        try {
          const result = await requestSync(
            force ? "/api/sync/dashboard?force=true" : "/api/sync/dashboard",
            abortController.signal,
            (event: DashboardProgressEvent) =>
              setProgress((rows) => applyDashboardProgress(rows, event))
          );
          if (abortController.signal.aborted) return;
          setRefreshResult(result);
        } catch (error) {
          if (abortController.signal.aborted || isAbortError(error)) return;
          if (error instanceof SyncRequestError) rejectAccess(error.status);
          console.error("No se pudieron actualizar los datos.", error);
          setRefreshResult(NETWORK_SYNC_FAILURE);
          setProgress((rows) => failDashboardProgress(rows));
        }
        await invalidateMonths();
        if (abortController.signal.aborted) return;
        refreshRequested.current = true;
        waitingForView = true;
        setProgress((rows) => setViewProgress(rows, "running"));
        startViewTransition(() => router.refresh());
      } finally {
        if (!waitingForView) {
          finishSync();
          syncFinished.current = null;
          operationRef.current = null;
          if (!abortController.signal.aborted) {
            setActiveOperation(null);
            setExpanded(false);
          }
        }
      }
    },
    [beginSync, enabled, invalidateMonths, rejectAccess, router]
  );

  useEffect(() => {
    if (!initialReady || !enabled || didAutoRefreshRef.current) return;
    let disposed = false;
    // Defer dispatch until effect replay has settled, without delaying progress.
    queueMicrotask(() => {
      if (disposed || didAutoRefreshRef.current) return;
      didAutoRefreshRef.current = true;
      void refresh(false);
    });
    return () => {
      disposed = true;
    };
  }, [enabled, initialReady, refresh]);

  useEffect(
    () => () => {
      operationAbort.current?.abort();
      syncFinished.current?.();
      void invalidateMonths();
    },
    [invalidateMonths]
  );

  useEffect(() => {
    if (!refreshRequested.current || viewPending) return;
    refreshRequested.current = false;
    operationRef.current = null;
    setProgress((rows) => setViewProgress(rows, "completed"));
    setExpanded(false);
    setActiveOperation(null);
    syncFinished.current?.();
    syncFinished.current = null;
  }, [viewPending]);

  function handleRefresh() {
    void refresh(true);
  }

  async function handleBackfill() {
    if (backfill.status !== "available" || operationRef.current) {
      return;
    }

    operationRef.current = "backfill";
    setActiveOperation("backfill");
    setBackfillResult(null);
    const finishSync = beginSync();
    syncFinished.current = finishSync;

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
      await invalidateMonths();
      finishSync();
      syncFinished.current = null;
      operationRef.current = null;
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
      {enabled || activeOperation === "refresh" ? (
        <LoadingSteps
          label={
            activeOperation === "refresh"
              ? "Actualizando tus cuentas"
              : shouldRetryRefresh
                ? "Reintentar actualización"
                : "Actualizar"
          }
          rows={progress}
          busy={activeOperation === "refresh"}
          expanded={expanded}
          onToggle={() => setExpanded((value) => !value)}
          onAction={handleRefresh}
          disabled={activeOperation === "backfill"}
        />
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
