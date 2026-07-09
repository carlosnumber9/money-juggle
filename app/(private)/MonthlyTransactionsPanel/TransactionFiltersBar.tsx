import type { TransactionCategoryGroupSummary } from "@/definitions";

import { TransactionCategoryFilterSelect } from "./TransactionCategoryFilterSelect";
import { TransactionFilterChips } from "./TransactionFilterChips";
import type {
  TransactionFilterId,
  TransactionFilters
} from "./transactionFilters";

export function TransactionFiltersBar({
  categoryGroups,
  filters,
  onFilterToggle,
  onUncategorizedFilterToggle,
  onCategoryToggle,
  onClearCategoryFilters
}: {
  categoryGroups: TransactionCategoryGroupSummary[];
  filters: TransactionFilters;
  onFilterToggle: (filterId: TransactionFilterId) => void;
  onUncategorizedFilterToggle: () => void;
  onCategoryToggle: (categoryId: string) => void;
  onClearCategoryFilters: () => void;
}) {
  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-2"
      aria-label="Filtros de movimientos"
    >
      <TransactionFilterChips
        activeFilters={filters.activeChipFilters}
        showUncategorized={filters.showUncategorized}
        isUncategorizedDisabled={filters.selectedCategoryIds.length > 0}
        onFilterToggle={onFilterToggle}
        onUncategorizedFilterToggle={onUncategorizedFilterToggle}
      />
      <TransactionCategoryFilterSelect
        categoryGroups={categoryGroups}
        selectedCategoryIds={filters.selectedCategoryIds}
        disabled={filters.showUncategorized}
        onCategoryToggle={onCategoryToggle}
        onClearCategoryFilters={onClearCategoryFilters}
      />
    </div>
  );
}
