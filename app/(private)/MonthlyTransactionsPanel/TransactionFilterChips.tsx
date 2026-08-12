import { Button } from "@/components/ui/button";

import {
  isTransactionChipFilterDisabled,
  type TransactionFilterId
} from "./transactionFilters";

const transactionFilters: {
  id: TransactionFilterId;
  label: string;
}[] = [
  { id: "ing", label: "ING" },
  { id: "caixabank", label: "CaixaBank" },
  { id: "trade-republic", label: "Trade Republic" },
  { id: "income", label: "Ingresos" },
  { id: "expense", label: "Gastos" }
];

export function TransactionFilterChips({
  activeFilters,
  showUncategorized,
  isUncategorizedDisabled,
  onUncategorizedFilterToggle,
  onFilterToggle
}: {
  activeFilters: TransactionFilterId[];
  showUncategorized: boolean;
  isUncategorizedDisabled: boolean;
  onUncategorizedFilterToggle: () => void;
  onFilterToggle: (filterId: TransactionFilterId) => void;
}) {
  return (
    <>
      {transactionFilters.map((filter) => {
        const isActive = activeFilters.includes(filter.id);
        const isDisabled = isTransactionChipFilterDisabled(
          filter.id,
          activeFilters
        );

        return (
          <Button
            key={filter.id}
            type="button"
            variant="outline"
            size="xs"
            aria-pressed={isActive}
            disabled={isDisabled}
            className="monthly-transaction-filter-chip normal-case tracking-normal"
            onClick={() => onFilterToggle(filter.id)}
          >
            {filter.label}
          </Button>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="xs"
        aria-pressed={showUncategorized}
        disabled={isUncategorizedDisabled}
        className="monthly-transaction-filter-chip normal-case tracking-normal"
        onClick={onUncategorizedFilterToggle}
      >
        Sin categorizar
      </Button>
    </>
  );
}
