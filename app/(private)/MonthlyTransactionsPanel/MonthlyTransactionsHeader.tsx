import { MonthNavigation } from "@/app/(private)/MonthNavigation";
import type {
  MonthlyPeriodView,
  TransactionCategoryGroupSummary
} from "@/definitions";

import { TransactionFiltersBar } from "./TransactionFiltersBar";
import type {
  TransactionFilterId,
  TransactionFilters
} from "./transactionFilters";

export function MonthlyTransactionsHeader({
  message,
  selectedMonth,
  categoryGroups,
  filters,
  onFilterToggle,
  onUncategorizedFilterToggle,
  onCategoryToggle,
  onClearCategoryFilters
}: {
  message: string | null;
  selectedMonth: MonthlyPeriodView;
  categoryGroups: TransactionCategoryGroupSummary[];
  filters: TransactionFilters;
  onFilterToggle: (filterId: TransactionFilterId) => void;
  onUncategorizedFilterToggle: () => void;
  onCategoryToggle: (categoryId: string) => void;
  onClearCategoryFilters: () => void;
}) {
  return (
    <div className="mb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="monthly-transactions-title"
          className="text-xl leading-tight font-semibold"
        >
          Movimientos
        </h2>
        <MonthNavigation selectedMonth={selectedMonth} tab="transactions" />
      </div>
      <div>
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
