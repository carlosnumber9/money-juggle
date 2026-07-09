"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function useTransactionSync(enabled: boolean) {
  const router = useRouter();
  const didRunRef = useRef(false);
  const isSyncingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncTransactions = useCallback(() => {
    if (!enabled || isSyncingRef.current) {
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    isSyncingRef.current = true;
    setIsSyncing(true);
    setSyncError(null);

    syncTransactionRows(abortController.signal, router.refresh)
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return;
        }

        console.error("No se pudieron actualizar los movimientos.", error);
        setSyncError("No se pudieron actualizar los movimientos.");
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          abortControllerRef.current = null;
          isSyncingRef.current = false;
          setIsSyncing(false);
        }
      });
  }, [enabled, router]);

  useEffect(() => {
    if (!enabled || didRunRef.current) {
      return;
    }

    didRunRef.current = true;
    syncTransactions();
  }, [enabled, syncTransactions]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return { isSyncing, syncError, syncTransactions };
}

async function syncTransactionRows(signal: AbortSignal, refresh: () => void) {
  const response = await fetch("/api/sync/transactions", {
    method: "POST",
    signal
  });

  if (!response.ok) {
    throw new Error("Could not sync transactions.");
  }

  const result = (await response.json()) as { synced?: boolean };

  if (result.synced) {
    refresh();
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
