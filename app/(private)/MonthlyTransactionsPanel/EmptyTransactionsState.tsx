export function EmptyTransactionsState({
  hasActiveFilters = false
}: {
  hasActiveFilters?: boolean;
}) {
  return (
    <p className="rounded-lg border bg-card px-4 py-6 text-sm text-muted-foreground">
      {hasActiveFilters
        ? "No hay movimientos que coincidan con estos filtros."
        : "Aún no hay movimientos de este mes."}
    </p>
  );
}
