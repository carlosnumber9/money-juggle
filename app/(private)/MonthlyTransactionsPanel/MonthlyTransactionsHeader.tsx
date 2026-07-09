import { RefreshCwIcon } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import type { TransactionCategoryGroupSummary } from "@/definitions";

import { TransactionFiltersBar } from "./TransactionFiltersBar";
import type {
  TransactionFilterId,
  TransactionFilters
} from "./transactionFilters";

export function MonthlyTransactionsHeader({
  message,
  isSyncing,
  enabled,
  categoryGroups,
  filters,
  onFilterToggle,
  onUncategorizedFilterToggle,
  onCategoryToggle,
  onClearCategoryFilters
}: {
  message: string | null;
  isSyncing: boolean;
  enabled: boolean;
  categoryGroups: TransactionCategoryGroupSummary[];
  filters: TransactionFilters;
  onFilterToggle: (filterId: TransactionFilterId) => void;
  onUncategorizedFilterToggle: () => void;
  onCategoryToggle: (categoryId: string) => void;
  onClearCategoryFilters: () => void;
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
        <TransactionFiltersBar
          categoryGroups={categoryGroups}
          filters={filters}
          onFilterToggle={onFilterToggle}
          onUncategorizedFilterToggle={onUncategorizedFilterToggle}
          onCategoryToggle={onCategoryToggle}
          onClearCategoryFilters={onClearCategoryFilters}
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
