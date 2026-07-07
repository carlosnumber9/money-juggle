import type { MonthlyTransactionSummary } from "@/definitions";

export function getTransactionConcept(
  transaction: MonthlyTransactionSummary
): string {
  return (
    transaction.merchant_name ??
    transaction.counterparty_name ??
    transaction.description ??
    "Movimiento sin descripción"
  );
}

export function formatTransactionDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short"
  }).format(new Date(`${value}T00:00:00`));
}

export function formatCurrency(amount: string, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency
  }).format(Number(amount));
}
