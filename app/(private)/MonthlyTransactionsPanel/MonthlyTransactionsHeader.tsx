import { RefreshCwIcon } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";

import {
  TransactionFilterChips,
  type TransactionFilterId
} from "./TransactionFilterChips";

export function MonthlyTransactionsHeader({
  message,
  isSyncing,
  enabled,
  activeFilters,
  onFilterToggle
}: {
  message: string | null;
  isSyncing: boolean;
  enabled: boolean;
  activeFilters: TransactionFilterId[];
  onFilterToggle: (filterId: TransactionFilterId) => void;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2
          id="monthly-transactions-title"
          className="text-xl leading-tight font-semibold"
        >
          Movimientos de este mes
        </h2>
        <TransactionFilterChips
          activeFilters={activeFilters}
          onFilterToggle={onFilterToggle}
        />
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
