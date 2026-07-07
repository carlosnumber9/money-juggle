import { ArrowDownLeftIcon, ArrowUpRightIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type {
  MonthlyCashflowBucket,
  MonthlyCashflowCardsProps
} from "@/definitions";
import { cn } from "@/lib/utils";

export function MonthlyCashflowCards({
  summary,
  error
}: MonthlyCashflowCardsProps) {
  return (
    <section
      className="mt-8 grid w-full grid-cols-2 gap-4 max-sm:grid-cols-1"
      aria-label="Resumen mensual"
    >
      <MonthlyCashflowCard
        title="Ingresos del mes"
        bucket={summary.income}
        error={error}
        tone="income"
      />
      <MonthlyCashflowCard
        title="Gastos del mes"
        bucket={summary.expenses}
        error={error}
        tone="expense"
      />
    </section>
  );
}

function MonthlyCashflowCard({
  title,
  bucket,
  error,
  tone
}: {
  title: string;
  bucket: MonthlyCashflowBucket;
  error: string | null;
  tone: "income" | "expense";
}) {
  const Icon = tone === "income" ? ArrowUpRightIcon : ArrowDownLeftIcon;

  return (
    <Card className="p-0">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-muted-foreground">
              {title}
            </h2>
            <div className="mt-3 space-y-1">
              {error ? (
                <p className="text-2xl font-semibold tracking-normal">
                  No disponible
                </p>
              ) : (
                <CashflowAmounts bucket={bucket} />
              )}
            </div>
          </div>
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full",
              tone === "income"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          {error ?? getTransactionCountLabel(bucket.transactionCount)}
        </p>
      </CardContent>
    </Card>
  );
}

function CashflowAmounts({ bucket }: { bucket: MonthlyCashflowBucket }) {
  if (bucket.totals.length === 0) {
    return (
      <p className="text-2xl font-semibold tracking-normal tabular-nums">
        {formatCurrency("0", "EUR")}
      </p>
    );
  }

  return bucket.totals.map((total) => (
    <p
      key={total.currency}
      className="text-2xl font-semibold tracking-normal tabular-nums"
    >
      {formatCurrency(total.amount, total.currency)}
    </p>
  ));
}

function getTransactionCountLabel(transactionCount: number): string {
  if (transactionCount === 1) {
    return "1 movimiento";
  }

  return `${transactionCount} movimientos`;
}

function formatCurrency(amount: string, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency
  }).format(Number(amount));
}
