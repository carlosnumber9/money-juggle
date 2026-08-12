import type { CSSProperties } from "react";

import type { MonthlyTransactionSummary } from "@/definitions";

export type InstitutionLogo = {
  color: string;
  fallback: string;
  label: string;
  path: string | null;
};

export type InstitutionLogoStyle = CSSProperties & {
  "--institution-logo": string;
  "--institution-logo-color": string;
};

export function getInstitutionLogo(
  transaction: MonthlyTransactionSummary
): InstitutionLogo {
  if (transaction.institution_slug === "ing") {
    return {
      color: "var(--bank-color-ing)",
      fallback: "I",
      label: transaction.institution_name,
      path: "/assets/institutions/ing.svg"
    };
  }

  if (transaction.institution_slug === "caixabank") {
    return {
      color: "var(--bank-color-caixabank)",
      fallback: "C",
      label: transaction.institution_name,
      path: "/assets/institutions/caixabank.svg"
    };
  }

  if (transaction.institution_slug === "trade-republic") {
    return {
      color: "var(--bank-color-trade-republic)",
      fallback: "T",
      label: transaction.institution_name,
      path: "/assets/institutions/trade-republic.svg"
    };
  }

  return {
    color: "var(--muted-foreground)",
    fallback: getInstitutionFallback(transaction.institution_name),
    label: transaction.institution_name,
    path: null
  };
}

function getInstitutionFallback(institutionName: string): string {
  return institutionName.trim().charAt(0).toUpperCase() || "?";
}
