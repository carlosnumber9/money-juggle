import { Clock3Icon } from "lucide-react";
import type { BankInstitutionCard } from "@/definitions";
import { AnimatedCurrency } from "./AnimatedCurrency";
import { formatPortfolioDate } from "../InvestmentsPanel/formatters";

export function InvestmentBalanceSummary({
  card
}: {
  card: BankInstitutionCard;
}) {
  return (
    <div className="mt-4 min-w-0 space-y-1 text-right">
      <p className="text-xs font-medium text-muted-foreground">Inversiones</p>
      {card.investmentBalance ? (
        <>
          <p className="text-[clamp(0.75rem,8cqi,1.5rem)] font-semibold tracking-normal">
            <AnimatedCurrency
              amount={card.investmentBalance.amount}
              currency="EUR"
            />
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3Icon className="size-3.5 shrink-0" aria-hidden />
            {formatPortfolioDate(card.investmentBalance.reportDate)}
          </p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          {card.investmentError ?? "Sin importaciones"}
        </p>
      )}
    </div>
  );
}
