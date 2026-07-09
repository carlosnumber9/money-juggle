import { TableCell, TableRow as BaseTableRow } from "@/components/ui/table";
import type {
  MonthlyTransactionSummary,
  TransactionCategoryGroupSummary
} from "@/definitions";
import { cn } from "@/lib/utils";

import { getAccountLabel } from "./accountLabel";
import { formatCurrency, getTransactionConcept } from "./formatters";
import { TransactionBankLogo } from "./TransactionBankLogo";
import { TransactionCategorySelect } from "./TransactionCategorySelect";

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

  return (
    <BaseTableRow
      aria-label={`${accountLabel}. ${concept}. ${formatCurrency(
        transaction.amount,
        transaction.currency
      )}.`}
      className="monthly-transaction-row"
    >
      <TableCell className="w-16 pl-4 pr-0">
        <TransactionBankLogo transaction={transaction} />
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
