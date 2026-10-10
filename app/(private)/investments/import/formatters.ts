export function formatImportAmount(value: string | null): string {
  return value === null
    ? "—"
    : new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR"
      }).format(Number(value));
}
