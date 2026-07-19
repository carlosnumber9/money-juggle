import type { MouseEvent } from "react";

import { TableCell, TableRow as BaseTableRow } from "@/components/ui/table";
import type {
  MonthlyTransactionSummary,
  TransactionCategoryGroupSummary
} from "@/definitions";
import { cn } from "@/lib/utils";
import { getTransactionLabelSummaryText } from "@/lib/domain/labels";

import { getAccountLabel } from "./accountLabel";
import { formatCurrency, getTransactionConcept } from "./formatters";
import { TransactionBankLogo } from "./TransactionBankLogo";
import { TransactionCategorySelect } from "./TransactionCategorySelect";

export function TransactionRow({
  transaction,
  categoryGroups,
  onSelect
}: {
  transaction: MonthlyTransactionSummary;
  categoryGroups: TransactionCategoryGroupSummary[];
  onSelect: (transaction: MonthlyTransactionSummary) => void;
}) {
  const concept = getTransactionConcept(transaction);
  const amount = Number(transaction.amount);
  const accountLabel = getAccountLabel(transaction);
  const labelSummary = getTransactionLabelSummaryText(transaction.labels);

  function handleRowClick(event: MouseEvent<HTMLTableRowElement>) {
    const target = event.target;

    if (
      target instanceof Element &&
      target.closest(
        "button, a, input, select, textarea, [role='button'], [role='option']"
      )
    ) {
      return;
    }

    event.currentTarget
      .querySelector<HTMLButtonElement>("[data-transaction-detail-trigger]")
      ?.focus();
    onSelect(transaction);
  }

  return (
    <BaseTableRow
      aria-label={`${accountLabel}. ${concept}. ${formatCurrency(
        transaction.amount,
        transaction.currency
      )}.${labelSummary ? ` Etiquetas: ${labelSummary}.` : ""}`}
      className="monthly-transaction-row cursor-pointer"
      onClick={handleRowClick}
    >
      <TableCell className="w-16 pl-4 pr-0">
        <TransactionBankLogo transaction={transaction} />
      </TableCell>
      <TableCell className="monthly-transaction-details-cell min-w-52 whitespace-normal py-3 pl-4">
        <div className="monthly-transaction-summary min-w-0">
          <button
            type="button"
            data-transaction-detail-trigger
            aria-haspopup="dialog"
            aria-label={`Ver detalle de ${concept}`}
            className="monthly-transaction-description line-clamp-2 cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            onClick={() => onSelect(transaction)}
          >
            {concept}
          </button>
          <TransactionCategorySelect
            transaction={transaction}
            categoryGroups={categoryGroups}
          />
          {labelSummary ? (
            <span className="monthly-transaction-label-chip max-w-52 truncate rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              {labelSummary}
            </span>
          ) : null}
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
