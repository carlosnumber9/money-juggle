import type { MonthlyTransactionSummary } from "@/definitions";

export function getInstitutionColor(
  slug: MonthlyTransactionSummary["institution_slug"]
): string {
  if (slug === "ing") {
    return "var(--bank-color-ing)";
  }

  if (slug === "caixabank") {
    return "var(--bank-color-caixabank)";
  }

  return "transparent";
}
