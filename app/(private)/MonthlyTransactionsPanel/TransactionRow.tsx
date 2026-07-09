import { useState, type CSSProperties } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { TableCell, TableRow as BaseTableRow } from "@/components/ui/table";
import type {
  MonthlyTransactionSummary,
  TransactionCategoryGroupSummary
} from "@/definitions";
import { cn } from "@/lib/utils";

import { formatCurrency, getTransactionConcept } from "./formatters";

export function TransactionRow({
  transaction,
  categoryGroups
}: {
  transaction: MonthlyTransactionSummary;
  categoryGroups: TransactionCategoryGroupSummary[];
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
      <TableCell className="w-16 pl-4 pr-0">
        <span
          aria-hidden
          className="flex size-11 items-center justify-center overflow-hidden rounded-full border border-border bg-transparent"
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
      <TableCell className="min-w-52 whitespace-normal py-3 pl-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="line-clamp-2">{concept}</span>
          <TransactionCategorySelect
            transaction={transaction}
            categoryGroups={categoryGroups}
          />
        </div>
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

function TransactionCategorySelect({
  transaction,
  categoryGroups
}: {
  transaction: MonthlyTransactionSummary;
  categoryGroups: TransactionCategoryGroupSummary[];
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    transaction.category?.id ?? null
  );

  return (
    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
      <SelectTrigger
        size="sm"
        aria-label={`Categoría de ${getTransactionConcept(transaction)}`}
        className="h-auto max-w-52 py-0 text-xs text-muted-foreground"
      >
        <SelectValue placeholder="Sin categoría">
          {(value) =>
            getSelectedCategoryLabel(value, categoryGroups, transaction)
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" className="min-w-64">
        {categoryGroups.map((group) => (
          <SelectGroup key={group.id}>
            <SelectLabel>{group.name}</SelectLabel>
            {group.categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

function getSelectedCategoryLabel(
  selectedCategoryId: string | null,
  categoryGroups: TransactionCategoryGroupSummary[],
  transaction: MonthlyTransactionSummary
): string {
  if (!selectedCategoryId) {
    return "Sin categoría";
  }

  if (selectedCategoryId === transaction.category?.id) {
    return transaction.category.name;
  }

  for (const group of categoryGroups) {
    const category = group.categories.find(
      (candidate) => candidate.id === selectedCategoryId
    );

    if (category) {
      return category.name;
    }
  }

  return "Sin categoría";
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
