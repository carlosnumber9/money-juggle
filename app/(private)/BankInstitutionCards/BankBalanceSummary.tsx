import { Clock3Icon } from "lucide-react";

import type { BankInstitutionCard } from "@/definitions";

import { AnimatedCurrency } from "./AnimatedCurrency";
import { formatLatestDate } from "./formatters";

export function BankBalanceSummary({ card }: { card: BankInstitutionCard }) {
  if (card.state !== "connected") {
    return null;
  }

  if (!card.balanceTotals || card.balanceTotals.length === 0) {
    return (
      <p className="mt-5 max-w-48 text-sm text-muted-foreground">
        {card.balanceLabel ?? "Saldo"} pendiente de sincronizar.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-1">
      {card.balanceLabel ? (
        <p className="text-xs font-medium text-muted-foreground">
          {card.balanceLabel}
        </p>
      ) : null}
      {card.balanceTotals.map((total) => (
        <p
          key={total.currency}
          className="text-2xl font-semibold tracking-normal"
        >
          <AnimatedCurrency amount={total.amount} currency={total.currency} />
        </p>
      ))}
      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock3Icon className="size-3.5" aria-hidden />
        {formatLatestDate(card.balanceTotals)}
      </p>
    </div>
  );
}
