"use client";

import { CheckCircle2Icon, CircleAlertIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import type { BankInstitutionCard } from "@/app/(private)/bank-connections-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";

type BankInstitutionCardsProps = {
  cards: BankInstitutionCard[];
};

type ApplicationResponse =
  | {
      ok: true;
      application: {
        name: string;
      };
    }
  | {
      ok: false;
      reason: string;
    };

type AspspsResponse =
  | {
      ok: true;
      aspsps: Array<{
        name: string;
        country: string;
      }>;
    }
  | {
      ok: false;
      reason: string;
    };

export function BankInstitutionCards({ cards }: BankInstitutionCardsProps) {
  const [resolvedCards, setResolvedCards] = useState(cards);

  useEffect(() => {
    let isActive = true;

    async function resolveEnableBankingCards() {
      const hasPendingProviderCards = cards.some(
        (card) => card.provider === "enable_banking" && card.state === "loading"
      );

      if (!hasPendingProviderCards) {
        return;
      }

      try {
        const applicationResponse = await fetch(
          "/api/integrations/enable-banking/application"
        );
        const applicationData =
          (await applicationResponse.json()) as ApplicationResponse;

        if (!isActive) {
          return;
        }

        if (!applicationResponse.ok || !applicationData.ok) {
          setResolvedCards((currentCards) =>
            markLoadingProviderCardsAsError(
              currentCards,
              !applicationData.ok && applicationData.reason
                ? applicationData.reason
                : "No se pudo comprobar la conexión con Enable Banking."
            )
          );
          return;
        }

        const aspspsResponse = await fetch(
          "/api/bank-connections/enable-banking/aspsps"
        );
        const aspspsData = (await aspspsResponse.json()) as AspspsResponse;

        if (!isActive) {
          return;
        }

        if (!aspspsResponse.ok || !aspspsData.ok) {
          setResolvedCards((currentCards) =>
            markLoadingProviderCardsAsError(
              currentCards,
              !aspspsData.ok && aspspsData.reason
                ? aspspsData.reason
                : "No se pudo cargar la lista de bancos."
            )
          );
          return;
        }

        setResolvedCards((currentCards) =>
          currentCards.map((card) => {
            if (
              card.provider !== "enable_banking" ||
              card.state !== "loading"
            ) {
              return card;
            }

            const aspsp = aspspsData.aspsps.find((candidate) =>
              candidate.name.toLowerCase().includes(card.name.toLowerCase())
            );

            if (!aspsp) {
              return {
                ...card,
                state: "unavailable",
                tooltip: `${card.name} no aparece ahora mismo en la lista de Enable Banking.`
              };
            }

            return {
              ...card,
              aspspName: aspsp.name,
              country: aspsp.country,
              state: "idle",
              tooltip: `${card.name} disponible en Enable Banking.`
            };
          })
        );
      } catch {
        if (!isActive) {
          return;
        }

        setResolvedCards((currentCards) =>
          markLoadingProviderCardsAsError(
            currentCards,
            "No se pudo contactar con el servidor."
          )
        );
      }
    }

    void resolveEnableBankingCards();

    return () => {
      isActive = false;
    };
  }, [cards]);

  return (
    <section
      className="mt-8 grid w-full grid-cols-3 gap-4 max-sm:grid-cols-1"
      aria-label="Entidades bancarias"
    >
      {resolvedCards.map((card) => (
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

function markLoadingProviderCardsAsError(
  cards: BankInstitutionCard[],
  tooltip: string
) {
  return cards.map((card) => {
    if (card.provider === "enable_banking" && card.state === "loading") {
      return {
        ...card,
        state: "error" as const,
        tooltip
      };
    }

    return card;
  });
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
