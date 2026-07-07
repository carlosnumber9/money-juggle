export function EmptyTransactionsState({
  isSyncing,
  hasActiveFilters = false
}: {
  isSyncing: boolean;
  hasActiveFilters?: boolean;
}) {
  return (
    <p className="rounded-lg border bg-card px-4 py-6 text-sm text-muted-foreground">
      {isSyncing
        ? "Buscando movimientos de este mes..."
        : hasActiveFilters
          ? "No hay movimientos que coincidan con estos filtros."
          : "Aún no hay movimientos de este mes."}
    </p>
  );
}
