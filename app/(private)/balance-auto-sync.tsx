"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function BalanceAutoSync({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const didRunRef = useRef(false);

  useEffect(() => {
    if (!enabled || didRunRef.current) {
      return;
    }

    didRunRef.current = true;
    const abortController = new AbortController();

    async function syncBalances() {
      const response = await fetch("/api/sync/balances", {
        method: "POST",
        signal: abortController.signal
      });

      if (!response.ok) {
        return;
      }

      const result = (await response.json()) as { synced?: boolean };

      if (result.synced) {
        router.refresh();
      }
    }

    syncBalances().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("No se pudieron actualizar los saldos.", error);
    });

    return () => {
      abortController.abort();
    };
  }, [enabled, router]);

  return null;
}
