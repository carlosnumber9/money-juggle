"use client";

import { RefreshCwIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import type {
  MonthlyTransactionSummary,
  MonthlyTransactionsPanelProps
} from "@/definitions";
import { cn } from "@/lib/utils";

type InstitutionColorStyle = CSSProperties & {
  "--institution-color"?: string;
};

export function MonthlyTransactionsPanel({
  enabled,
  transactions,
  error
}: MonthlyTransactionsPanelProps) {
  const router = useRouter();
  const didRunRef = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || didRunRef.current) {
      return;
    }

    didRunRef.current = true;
    const abortController = new AbortController();

    async function syncTransactions() {
      setIsSyncing(true);
      setSyncError(null);

      const response = await fetch("/api/sync/transactions", {
        method: "POST",
        signal: abortController.signal
      });

      if (!response.ok) {
        setSyncError("No se pudieron actualizar los movimientos.");
        return;
      }

      const result = (await response.json()) as { synced?: boolean };

      if (result.synced) {
        router.refresh();
      }
    }

    syncTransactions()
      .catch((caughtError: unknown) => {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "No se pudieron actualizar los movimientos.",
          caughtError
        );
        setSyncError("No se pudieron actualizar los movimientos.");
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsSyncing(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [enabled, router]);

  const message = syncError ?? error;

  return (
    <section className="mt-10" aria-labelledby="monthly-transactions-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2
            id="monthly-transactions-title"
            className="text-xl font-semibold leading-tight"
          >
            Movimientos de este mes
          </h2>
          {message ? (
            <p className="mt-1 text-sm text-destructive">{message}</p>
          ) : null}
        </div>
        {isSyncing ? (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" aria-hidden />
            Actualizando...
          </p>
        ) : enabled ? (
          <RefreshCwIcon
            className="size-4 text-muted-foreground"
            aria-label="Movimientos actualizados recientemente"
          />
        ) : null}
      </div>

      {transactions.length > 0 ? (
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
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="rounded-lg border bg-card px-4 py-6 text-sm text-muted-foreground">
          {isSyncing
            ? "Buscando movimientos de este mes..."
            : "Aún no hay movimientos de este mes."}
        </p>
      )}
    </section>
  );
}

function TransactionRow({
  transaction
}: {
  transaction: MonthlyTransactionSummary;
}) {
  const style = {
    "--institution-color": getInstitutionColor(transaction.institution_slug)
  } as InstitutionColorStyle;
  const isKnownInstitution = transaction.institution_slug !== "unknown";
  const amount = Number(transaction.amount);
  const isNegative = amount < 0;
  const concept = getTransactionConcept(transaction);
  const accountLabel = transaction.account_iban_last4
    ? `${transaction.institution_name}, ${transaction.account_name}, terminada en ${transaction.account_iban_last4}`
    : `${transaction.institution_name}, ${transaction.account_name}`;

  return (
    <TableRow
      style={style}
      data-bank-colored={isKnownInstitution ? "true" : undefined}
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
          isNegative ? "text-foreground" : "text-primary"
        )}
      >
        {formatCurrency(transaction.amount, transaction.currency)}
      </TableCell>
    </TableRow>
  );
}

function getInstitutionColor(
  slug: MonthlyTransactionSummary["institution_slug"]
): string {
  if (slug === "ing") {
    return "var(--bank-color-ing)";
  }

  if (slug === "caixabank") {
    return "var(--bank-color-caixabank)";
  }

  return "transparent";
}

function getTransactionConcept(transaction: MonthlyTransactionSummary): string {
  return (
    transaction.merchant_name ??
    transaction.counterparty_name ??
    transaction.description ??
    "Movimiento sin descripción"
  );
}

function formatTransactionDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short"
  }).format(new Date(`${value}T00:00:00`));
}

function formatCurrency(amount: string, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency
  }).format(Number(amount));
}
