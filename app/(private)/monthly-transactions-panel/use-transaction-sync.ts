"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function useTransactionSync(enabled: boolean) {
  const router = useRouter();
  const didRunRef = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || didRunRef.current) {
      return;
    }

    didRunRef.current = true;
    const abortController = new AbortController();

    syncTransactions(abortController.signal, router.refresh)
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return;
        }

        console.error("No se pudieron actualizar los movimientos.", error);
        setSyncError("No se pudieron actualizar los movimientos.");
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsSyncing(false);
        }
      });

    setIsSyncing(true);
    setSyncError(null);

    return () => {
      abortController.abort();
    };
  }, [enabled, router]);

  return { isSyncing, syncError };
}

async function syncTransactions(signal: AbortSignal, refresh: () => void) {
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
