import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
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
    <div className="monthly-transactions-table rounded-lg bg-card">
      <Table>
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
