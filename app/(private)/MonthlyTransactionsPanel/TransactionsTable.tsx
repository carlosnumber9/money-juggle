import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type {
  MonthlyTransactionSummary,
  TransactionCategoryGroupSummary
} from "@/definitions";

import { formatTransactionDateHeading } from "./formatters";
import {
  groupTransactionsByDate,
  type TransactionDateGroup
} from "./transactionDateGroups";
import { TransactionRow } from "./TransactionRow";

export function TransactionsTable({
  transactions,
  categoryGroups
}: {
  transactions: MonthlyTransactionSummary[];
  categoryGroups: TransactionCategoryGroupSummary[];
}) {
  const transactionGroups = groupTransactionsByDate(transactions);

  return (
    <div className="monthly-transactions-table rounded-lg bg-card">
      <Table>
        <TableBody>
          {transactionGroups.map((group, index) => (
            <TransactionDateGroup
              key={`${group.date ?? "unknown"}-${index}`}
              group={group}
              categoryGroups={categoryGroups}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TransactionDateGroup({
  group,
  categoryGroups
}: {
  group: TransactionDateGroup;
  categoryGroups: TransactionCategoryGroupSummary[];
}) {
  return (
    <>
      <TableRow className="monthly-transaction-date-row border-b-0 hover:bg-card">
        <TableCell
          colSpan={3}
          className="monthly-transaction-date-cell px-4 py-2.5 text-xs font-medium text-muted-foreground"
        >
          {group.date
            ? formatTransactionDateHeading(group.date)
            : "Fecha desconocida"}
        </TableCell>
      </TableRow>
      {group.transactions.map((transaction) => (
        <TransactionRow
          key={transaction.id}
          transaction={transaction}
          categoryGroups={categoryGroups}
        />
      ))}
    </>
  );
}
