"use client";

import { CheckCircle2Icon, CircleAlertIcon } from "lucide-react";
import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";
import type { BankInstitutionCard } from "@/lib/views/private-home-types";

type BankInstitutionCardsProps = {
  cards: BankInstitutionCard[];
};

export function BankInstitutionCards({ cards }: BankInstitutionCardsProps) {
  return (
    <section
      className="mt-8 grid w-full grid-cols-3 gap-4 max-sm:grid-cols-1"
      aria-label="Entidades bancarias"
    >
      {cards.map((card) => (
        <Card
          key={card.slug}
          className="relative min-h-[clamp(160px,18vw,240px)] overflow-hidden p-0"
        >
          <Image
            src={card.logoPath}
            alt=""
            width={420}
            height={220}
            aria-hidden
            className="pointer-events-none absolute right-[-10%] bottom-[8%] z-0 w-[112%] opacity-50"
          />
          <CardContent className="relative z-10 flex min-h-[clamp(160px,18vw,240px)] items-start bg-card/85 p-4 text-left">
            <span className="max-w-[calc(100%-3rem)] text-base font-semibold">
              {card.name}
            </span>
          </CardContent>
          <BankStatusIcon card={card} />
        </Card>
      ))}
    </section>
  );
}

function BankStatusIcon({ card }: { card: BankInstitutionCard }) {
  return (
    <div className="absolute top-3 right-3 z-20">
      <Tooltip
        triggerLabel={card.tooltip}
        label={card.tooltip}
        triggerClassName={getStatusToneClass(card.state)}
      >
        {getStatusIcon(card.state)}
      </Tooltip>
    </div>
  );
}

function getStatusToneClass(state: BankInstitutionCard["state"]) {
  if (state === "connected" || state === "idle") {
    return "bg-background/90 text-primary backdrop-blur hover:bg-muted";
  }

  if (state === "loading" || state === "linking") {
    return "bg-background/90 text-muted-foreground backdrop-blur hover:bg-muted";
  }

  return "bg-background/90 text-destructive backdrop-blur hover:bg-destructive/10";
}

function getStatusIcon(state: BankInstitutionCard["state"]) {
  if (state === "loading" || state === "linking") {
    return <Spinner aria-hidden />;
  }

  if (state === "connected" || state === "idle") {
    return <CheckCircle2Icon className="size-5" aria-hidden />;
  }

  return <CircleAlertIcon className="size-5" aria-hidden />;
}
