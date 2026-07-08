import { Button } from "@/components/ui/button";
import type { MonthlyTransactionSummary } from "@/definitions";

export type TransactionFilterId = "ing" | "caixabank" | "income" | "expense";
type InstitutionFilterId = Extract<
  MonthlyTransactionSummary["institution_slug"],
  TransactionFilterId
>;

const transactionFilters: {
  id: TransactionFilterId;
  label: string;
}[] = [
  { id: "ing", label: "ING" },
  { id: "caixabank", label: "CaixaBank" },
  { id: "income", label: "Ingresos" },
  { id: "expense", label: "Gastos" }
];

export function TransactionFilterChips({
  activeFilters,
  onFilterToggle
}: {
  activeFilters: TransactionFilterId[];
  onFilterToggle: (filterId: TransactionFilterId) => void;
}) {
  return (
    <div
      className="mt-3 flex flex-wrap gap-2"
      aria-label="Filtros de movimientos"
    >
      {transactionFilters.map((filter) => {
        const isActive = activeFilters.includes(filter.id);
        const isDisabled = isFilterDisabled(filter.id, activeFilters);

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
    </div>
  );
}

export function filterMonthlyTransactions(
  transactions: MonthlyTransactionSummary[],
  activeFilters: TransactionFilterId[]
): MonthlyTransactionSummary[] {
  if (activeFilters.length === 0) {
    return transactions;
  }

  return transactions.filter((transaction) => {
    return (
      matchesInstitutionFilter(transaction, activeFilters) &&
      matchesAmountFilter(transaction, activeFilters)
    );
  });
}

function matchesInstitutionFilter(
  transaction: MonthlyTransactionSummary,
  activeFilters: TransactionFilterId[]
): boolean {
  const institutionFilters = activeFilters.filter(isInstitutionFilter);

  if (institutionFilters.length === 0) {
    return true;
  }

  if (transaction.institution_slug === "unknown") {
    return false;
  }

  return institutionFilters.every(
    (institutionFilter) => transaction.institution_slug === institutionFilter
  );
}

function matchesAmountFilter(
  transaction: MonthlyTransactionSummary,
  activeFilters: TransactionFilterId[]
): boolean {
  const showIncome = activeFilters.includes("income");
  const showExpenses = activeFilters.includes("expense");

  if (!showIncome && !showExpenses) {
    return true;
  }

  const amount = Number(transaction.amount);

  return (!showIncome || amount > 0) && (!showExpenses || amount < 0);
}

function isInstitutionFilter(
  filterId: TransactionFilterId
): filterId is InstitutionFilterId {
  return filterId === "ing" || filterId === "caixabank";
}

function isFilterDisabled(
  filterId: TransactionFilterId,
  activeFilters: TransactionFilterId[]
): boolean {
  const oppositeFilter = getOppositeFilter(filterId);

  return oppositeFilter ? activeFilters.includes(oppositeFilter) : false;
}

function getOppositeFilter(
  filterId: TransactionFilterId
): TransactionFilterId | null {
  switch (filterId) {
    case "ing":
      return "caixabank";
    case "caixabank":
      return "ing";
    case "income":
      return "expense";
    case "expense":
      return "income";
  }
}
