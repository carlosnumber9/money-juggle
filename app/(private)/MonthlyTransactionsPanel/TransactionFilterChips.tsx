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

        return (
          <Button
            key={filter.id}
            type="button"
            variant="outline"
            size="xs"
            aria-pressed={isActive}
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

  return institutionFilters.includes(transaction.institution_slug);
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

  return (showIncome && amount > 0) || (showExpenses && amount < 0);
}

function isInstitutionFilter(
  filterId: TransactionFilterId
): filterId is InstitutionFilterId {
  return filterId === "ing" || filterId === "caixabank";
}
