import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import type { BankInstitutionCard } from "@/definitions";

import { BankBalanceSummary } from "./BankBalanceSummary";
import { InvestmentBalanceSummary } from "./InvestmentBalanceSummary";
import { BankStatusIcon } from "./BankStatusIcon";

export function BankCard({ card }: { card: BankInstitutionCard }) {
  return (
    <Card className="relative overflow-hidden p-0">
      <Image
        src={card.logoPath}
        alt=""
        width={420}
        height={220}
        aria-hidden
        className="pointer-events-none absolute top-[56%] left-1/2 z-0 w-[210%] -translate-x-1/2 -translate-y-1/2 scale-[1.65] opacity-10"
      />
      <CardContent className="@container relative z-10 p-4 text-left">
        <div className="flex w-full flex-col gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 pr-9">
              <span className="block truncate text-base font-semibold">
                {card.name}
              </span>
              {card.beta && card.slug !== "trade-republic" ? (
                <span className="border border-border px-1.5 py-0.5 text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
                  Beta
                </span>
              ) : null}
            </div>
            {card.slug === "trade-republic" ? (
              <div className="grid grid-cols-2 items-start gap-3">
                <div className="min-w-0">
                  <BankBalanceSummary card={card} />
                </div>
                <InvestmentBalanceSummary card={card} />
              </div>
            ) : (
              <BankBalanceSummary card={card} />
            )}
            {card.state === "reconnection-required" ? (
              <p className="mt-3 text-sm text-destructive">
                Necesita reconexión. Los datos guardados se conservan.
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
      <BankStatusIcon card={card} />
    </Card>
  );
}
