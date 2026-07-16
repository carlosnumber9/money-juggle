import type { TransactionCategoryGroupSummary } from "@/definitions";

import { TransactionFiltersBar } from "./TransactionFiltersBar";
import type {
  TransactionFilterId,
  TransactionFilters
} from "./transactionFilters";

export function MonthlyTransactionsHeader({
  message,
  categoryGroups,
  filters,
  onFilterToggle,
  onUncategorizedFilterToggle,
  onCategoryToggle,
  onClearCategoryFilters
}: {
  message: string | null;
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
    </div>
  );
}
