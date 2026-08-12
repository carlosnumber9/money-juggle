import type { BankInstitutionCardsProps } from "@/definitions";

import { BankConnectionResume } from "./BankConnectionResume";
import { BankCard } from "./BankCard";

export function BankInstitutionCards({ cards }: BankInstitutionCardsProps) {
  const hasLinkingConnection = cards.some((card) => card.state === "linking");

  return (
    <>
      <BankConnectionResume hasLinkingConnection={hasLinkingConnection} />
      <section
        className="mt-8 grid w-full grid-cols-3 items-start gap-4 max-sm:grid-cols-1"
        aria-label="Entidades bancarias"
      >
        {cards.map((card) => (
          <BankCard key={card.slug} card={card} />
        ))}
      </section>
    </>
  );
}
