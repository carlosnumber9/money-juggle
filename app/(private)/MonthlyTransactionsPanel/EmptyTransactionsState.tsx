export function EmptyTransactionsState({ isSyncing }: { isSyncing: boolean }) {
  return (
    <p className="rounded-lg border bg-card px-4 py-6 text-sm text-muted-foreground">
      {isSyncing
        ? "Buscando movimientos de este mes..."
        : "Aún no hay movimientos de este mes."}
    </p>
  );
}
