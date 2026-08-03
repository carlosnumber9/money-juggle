import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type {
  MonthlyTransactionCategory,
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
  categoryGroups,
  onTransactionCategoryChange,
  onTransactionSelect
}: {
  transactions: MonthlyTransactionSummary[];
  categoryGroups: TransactionCategoryGroupSummary[];
  onTransactionCategoryChange: (
    transactionId: string,
    category: MonthlyTransactionCategory | null
  ) => void;
  onTransactionSelect: (transaction: MonthlyTransactionSummary) => void;
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
              onTransactionCategoryChange={onTransactionCategoryChange}
              onTransactionSelect={onTransactionSelect}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TransactionDateGroup({
  group,
  categoryGroups,
  onTransactionCategoryChange,
  onTransactionSelect
}: {
  group: TransactionDateGroup;
  categoryGroups: TransactionCategoryGroupSummary[];
  onTransactionCategoryChange: (
    transactionId: string,
    category: MonthlyTransactionCategory | null
  ) => void;
  onTransactionSelect: (transaction: MonthlyTransactionSummary) => void;
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
          onCategoryChange={(category) =>
            onTransactionCategoryChange(transaction.id, category)
          }
          onSelect={onTransactionSelect}
        />
      ))}
    </>
  );
}
