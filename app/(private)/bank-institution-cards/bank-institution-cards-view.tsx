import type { BankInstitutionCardsProps } from "@/definitions";

import { BankCard } from "./bank-card";

export function BankInstitutionCards({ cards }: BankInstitutionCardsProps) {
  return (
    <section
      className="mt-8 grid w-full grid-cols-3 items-start gap-4 max-sm:grid-cols-1"
      aria-label="Entidades bancarias"
    >
      {cards.map((card) => (
        <BankCard key={card.slug} card={card} />
      ))}
    </section>
  );
}
