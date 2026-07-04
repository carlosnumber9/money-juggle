"use client";

import { CheckCircle2Icon, CircleAlertIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import type { BankInstitutionCard } from "@/app/(private)/bank-connections-panel";
import { Spinner } from "@/components/ui/spinner";

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
    <section className="bank-institution-grid" aria-label="Entidades bancarias">
      {resolvedCards.map((card) => (
        <div
          key={card.slug}
          className="bank-institution-card"
          style={getLogoStyle(card.logoPath)}
        >
          <div className="bank-institution-card-content">
            <span className="bank-institution-title">{card.name}</span>
          </div>
          <BankStatusIcon card={card} />
        </div>
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

function getLogoStyle(logoPath: string): CSSProperties {
  return {
    "--bank-logo": `url(${logoPath})`
  } as CSSProperties;
}

function BankStatusIcon({ card }: { card: BankInstitutionCard }) {
  const tone = getStatusTone(card.state);

  return (
    <span
      className="bank-institution-status"
      data-tone={tone}
      aria-label={card.tooltip}
    >
      {getStatusIcon(card.state)}
      <span className="bank-institution-status-tooltip" role="tooltip">
        {card.tooltip}
      </span>
    </span>
  );
}

function getStatusTone(state: BankInstitutionCard["state"]) {
  if (state === "connected" || state === "idle") {
    return "success";
  }

  if (state === "loading" || state === "linking") {
    return "loading";
  }

  return "error";
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
