import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import type { MonthlyTransactionSummary } from "@/definitions";

import { TransactionRow } from "./transaction-row";

export function TransactionsTable({
  transactions
}: {
  transactions: MonthlyTransactionSummary[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28 pl-4">Fecha</TableHead>
            <TableHead>Concepto</TableHead>
            <TableHead className="w-32 pr-4 text-right">Importe</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
