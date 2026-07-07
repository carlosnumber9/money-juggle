import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/Table";
import type { MonthlyTransactionSummary } from "@/definitions";

import { formatTransactionDateHeading } from "./formatters";
import { TransactionRow } from "./TransactionRow";

export function TransactionsTable({
  transactions
}: {
  transactions: MonthlyTransactionSummary[];
}) {
  const transactionGroups = groupTransactionsByDate(transactions);

  return (
    <div className="monthly-transactions-table rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Concepto</TableHead>
            <TableHead className="w-32 pr-4 text-right">Importe</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactionGroups.map((group, index) => (
            <TransactionDateGroup
              key={`${group.date ?? "unknown"}-${index}`}
              group={group}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TransactionDateGroup({ group }: { group: TransactionDateGroup }) {
  return (
    <>
      <TableRow className="monthly-transaction-date-row hover:bg-card">
        <TableCell
          colSpan={2}
          className="monthly-transaction-date-cell px-4 py-2.5 text-xs font-medium text-muted-foreground"
        >
          {group.date
            ? formatTransactionDateHeading(group.date)
            : "Fecha desconocida"}
        </TableCell>
      </TableRow>
      {group.transactions.map((transaction) => (
        <TransactionRow key={transaction.id} transaction={transaction} />
      ))}
    </>
  );
}

type TransactionDateGroup = {
  date: string | null;
  transactions: MonthlyTransactionSummary[];
};

function groupTransactionsByDate(
  transactions: MonthlyTransactionSummary[]
): TransactionDateGroup[] {
  const groups: TransactionDateGroup[] = [];

  for (const transaction of transactions) {
    const previousGroup = groups.at(-1);

    if (previousGroup && previousGroup.date === transaction.booking_date) {
      previousGroup.transactions.push(transaction);
      continue;
    }

    groups.push({
      date: transaction.booking_date,
      transactions: [transaction]
    });
  }

  return groups;
}
