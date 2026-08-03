"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { DashboardSyncControlsProps } from "@/definitions";

type ActiveOperation = "refresh" | "backfill" | null;

export function DashboardSyncControls({
  enabled,
  backfill
}: DashboardSyncControlsProps) {
  const router = useRouter();
  const didAutoRefreshRef = useRef(false);
  const [activeOperation, setActiveOperation] = useState<ActiveOperation>(null);
  const [shouldRetryRefresh, setShouldRetryRefresh] = useState(false);
  const [shouldRetryBackfill, setShouldRetryBackfill] = useState(false);

  useEffect(() => {
    if (!enabled || didAutoRefreshRef.current) {
      return;
    }

    didAutoRefreshRef.current = true;
    const abortController = new AbortController();

    setActiveOperation("refresh");
    requestDashboardRefresh({
      forceBalances: false,
      signal: abortController.signal
    })
      .then((result) => {
        setShouldRetryRefresh(result.partialFailure);

        if (result.synced) {
          router.refresh();
        }
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return;
        }

        console.error("No se pudieron actualizar los datos.", error);
        setShouldRetryRefresh(true);
        router.refresh();
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setActiveOperation(null);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [enabled, router]);

  async function handleRefresh() {
    if (!enabled || activeOperation) {
      return;
    }

    setActiveOperation("refresh");
    setShouldRetryRefresh(false);

    try {
      const result = await requestDashboardRefresh({ forceBalances: true });

      setShouldRetryRefresh(result.partialFailure);
      router.refresh();
    } catch (error) {
      console.error("No se pudieron actualizar los datos.", error);
      setShouldRetryRefresh(true);
      router.refresh();
    } finally {
      setActiveOperation(null);
    }
  }

  async function handleBackfill() {
    if (backfill.status !== "available" || activeOperation) {
      return;
    }

    setActiveOperation("backfill");
    setShouldRetryBackfill(false);

    try {
      const result = await requestTransactionBackfill();

      setShouldRetryBackfill(Boolean(result.partialFailure));
      router.refresh();
    } catch (error) {
      console.error("No se pudo importar el historial de movimientos.", error);
      setShouldRetryBackfill(true);
      router.refresh();
    } finally {
      setActiveOperation(null);
    }
  }

  if (!enabled && backfill.status === "hidden") {
    return null;
  }

  const isBusy = activeOperation !== null;

  return (
    <div className="mt-6 flex flex-wrap justify-end gap-2">
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

async function requestDashboardRefresh({
  forceBalances,
  signal
}: {
  forceBalances: boolean;
  signal?: AbortSignal;
}): Promise<{ synced: boolean; partialFailure: boolean }> {
  const path = forceBalances
    ? "/api/sync/dashboard?force=true"
    : "/api/sync/dashboard";
  const response = await fetch(path, { method: "POST", signal });
  const result = (await response.json()) as {
    synced?: boolean;
    partialFailure?: boolean;
    rateLimited?: boolean;
  };

  if (!response.ok && response.status !== 429) {
    throw new Error("Could not refresh dashboard data.");
  }

  return {
    synced: Boolean(result.synced),
    partialFailure: Boolean(result.partialFailure && !result.rateLimited)
  };
}

async function requestTransactionBackfill(): Promise<{
  partialFailure?: boolean;
}> {
  const response = await fetch("/api/sync/transactions/backfill", {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Could not backfill transactions.");
  }

  return (await response.json()) as { partialFailure?: boolean };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
