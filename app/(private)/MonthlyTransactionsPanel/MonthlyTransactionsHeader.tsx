import { RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  onClearCategoryFilters,
  onSyncTransactions
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
  onSyncTransactions: () => void;
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
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Actualizando movimientos"
          disabled
          className="text-muted-foreground hover:bg-transparent"
        >
          <Spinner className="size-4" aria-hidden />
        </Button>
      ) : enabled ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Actualizar movimientos"
          onClick={onSyncTransactions}
          className="cursor-pointer text-muted-foreground hover:bg-transparent"
        >
          <RefreshCwIcon
            aria-hidden
            className="size-4 transition-transform group-hover/button:scale-150"
          />
        </Button>
      ) : null}
    </div>
  );
}
