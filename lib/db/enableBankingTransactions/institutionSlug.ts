import type { MonthlyTransactionSummary } from "@/definitions";

export function getInstitutionSlug(
  institutionName: string
): MonthlyTransactionSummary["institution_slug"] {
  const normalized = institutionName.toLowerCase();

  if (normalized.includes("ing")) {
    return "ing";
  }

  if (
    normalized.includes("caixabank") ||
    normalized.includes("caixa bank") ||
    normalized.includes("la caixa")
  ) {
    return "caixabank";
  }

  if (
    normalized.includes("trade republic") ||
    normalized.includes("trade-republic")
  ) {
    return "trade-republic";
  }

  return "unknown";
}
