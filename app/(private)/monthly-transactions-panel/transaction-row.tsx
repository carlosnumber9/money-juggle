import { TableCell, TableRow as BaseTableRow } from "@/components/ui/table";
import type { MonthlyTransactionSummary } from "@/definitions";
import { cn } from "@/lib/utils";

import {
  formatCurrency,
  formatTransactionDate,
  getTransactionConcept
} from "./formatters";
import { getInstitutionColor } from "./institution-color";
import type { InstitutionColorStyle } from "./types";

export function TransactionRow({
  transaction
}: {
  transaction: MonthlyTransactionSummary;
}) {
  const concept = getTransactionConcept(transaction);
  const amount = Number(transaction.amount);
  const accountLabel = getAccountLabel(transaction);
  const style = {
    "--institution-color": getInstitutionColor(transaction.institution_slug)
  } as InstitutionColorStyle;

  return (
    <BaseTableRow
      style={style}
      data-bank-colored={getBankColoredValue(transaction)}
      aria-label={`${accountLabel}. ${concept}. ${formatCurrency(
        transaction.amount,
        transaction.currency
      )}.`}
      className="monthly-transaction-row"
    >
      <TableCell className="pl-4 text-muted-foreground">
        {transaction.booking_date
          ? formatTransactionDate(transaction.booking_date)
          : "-"}
      </TableCell>
      <TableCell className="min-w-52 whitespace-normal">
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

function getBankColoredValue(transaction: MonthlyTransactionSummary) {
  return transaction.institution_slug !== "unknown" ? "true" : undefined;
}
