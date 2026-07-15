"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { TransactionBackfillPanelProps } from "@/definitions";

export function TransactionBackfillPanel({
  view
}: TransactionBackfillPanelProps) {
  const router = useRouter();
  const [isImporting, setIsImporting] = useState(false);
  const [shouldRetry, setShouldRetry] = useState(false);

  if (view.status === "hidden") {
    return null;
  }

  async function handleImport() {
    if (view.status !== "available" || isImporting) {
      return;
    }

    setIsImporting(true);
    setShouldRetry(false);

    try {
      const result = await requestTransactionBackfill();

      if (result.partialFailure) {
        setShouldRetry(true);
      }

      router.refresh();
    } catch (error) {
      console.error("No se pudo importar el historial de movimientos.", error);
      setShouldRetry(true);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="mt-6 flex justify-end">
      <Button
        type="button"
        size="sm"
        variant={shouldRetry ? "destructive" : "default"}
        disabled={isImporting}
        onClick={handleImport}
      >
        {isImporting ? (
          <>
            <Spinner aria-hidden />
            Importando
          </>
        ) : shouldRetry ? (
          "Reintentar historial"
        ) : (
          "Importar historial"
        )}
      </Button>
    </div>
  );
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
