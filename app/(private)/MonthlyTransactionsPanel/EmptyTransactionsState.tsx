export function EmptyTransactionsState({
  hasActiveFilters = false,
  monthLabel
}: {
  hasActiveFilters?: boolean;
  monthLabel: string;
}) {
  return (
    <p className="rounded-lg border bg-card px-4 py-6 text-sm text-muted-foreground">
      {hasActiveFilters
        ? "No hay movimientos que coincidan con estos filtros."
        : `Aún no hay movimientos guardados en ${monthLabel}.`}
    </p>
  );
}
