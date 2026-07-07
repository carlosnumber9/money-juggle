import type { CSSProperties } from "react";

import { TableCell, TableRow as BaseTableRow } from "@/components/ui/Table";
import type { MonthlyTransactionSummary } from "@/definitions";
import { cn } from "@/lib/utils";

import { formatCurrency, getTransactionConcept } from "./formatters";

export function TransactionRow({
  transaction
}: {
  transaction: MonthlyTransactionSummary;
}) {
  const concept = getTransactionConcept(transaction);
  const amount = Number(transaction.amount);
  const accountLabel = getAccountLabel(transaction);
  const logo = getInstitutionLogo(transaction);

  return (
    <BaseTableRow
      aria-label={`${accountLabel}. ${concept}. ${formatCurrency(
        transaction.amount,
        transaction.currency
      )}.`}
      className="monthly-transaction-row"
    >
      <TableCell className="w-12 pl-4 pr-0">
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-full border border-border bg-transparent"
          title={logo.label}
        >
          {logo.path ? (
            <span
              className="monthly-transaction-bank-logo"
              style={
                {
                  "--institution-logo": `url(${logo.path})`,
                  "--institution-logo-color": logo.color
                } as InstitutionLogoStyle
              }
            />
          ) : (
            <span className="text-[0.625rem] font-medium text-muted-foreground">
              {logo.fallback}
            </span>
          )}
        </span>
      </TableCell>
      <TableCell className="min-w-52 whitespace-normal pl-4">
        <span className="line-clamp-2">{concept}</span>
      </TableCell>
      <TableCell
        className={cn(
          "pr-4 text-right font-semibold tabular-nums",
          amount < 0 ? "text-foreground" : "text-primary"
        )}
      >
        {formatCurrency(transaction.amount, transaction.currency)}
      </TableCell>
    </BaseTableRow>
  );
}

function getAccountLabel(transaction: MonthlyTransactionSummary): string {
  if (transaction.account_iban_last4) {
    return `${transaction.institution_name}, ${transaction.account_name}, terminada en ${transaction.account_iban_last4}`;
  }

  return `${transaction.institution_name}, ${transaction.account_name}`;
}

type InstitutionLogo = {
  color: string;
  fallback: string;
  label: string;
  path: string | null;
};

type InstitutionLogoStyle = CSSProperties & {
  "--institution-logo": string;
  "--institution-logo-color": string;
};

function getInstitutionLogo(
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
