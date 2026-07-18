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

export function formatTransactionDateHeading(value: string): string {
  const formattedDate = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(new Date(`${value}T00:00:00`));

  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
}

export function formatCurrency(amount: string, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency
  }).format(Number(amount));
}

export function formatTransactionDetailDate(value: string | null): string {
  if (!value) {
    return "Fecha desconocida";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}
