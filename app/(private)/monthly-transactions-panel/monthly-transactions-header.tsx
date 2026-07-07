import { RefreshCwIcon } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";

export function MonthlyTransactionsHeader({
  message,
  isSyncing,
  enabled
}: {
  message: string | null;
  isSyncing: boolean;
  enabled: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2
          id="monthly-transactions-title"
          className="text-xl leading-tight font-semibold"
        >
          Movimientos de este mes
        </h2>
        {message ? (
          <p className="mt-1 text-sm text-destructive">{message}</p>
        ) : null}
      </div>
      {isSyncing ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" aria-hidden />
          Actualizando...
        </p>
      ) : enabled ? (
        <RefreshCwIcon
          className="size-4 text-muted-foreground"
          aria-label="Movimientos actualizados recientemente"
        />
      ) : null}
    </div>
  );
}
