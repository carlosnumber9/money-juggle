import { BankInstitutionCards } from "@/app/(private)/bank-institution-cards";
import type { BankInstitutionCard } from "@/lib/views/private-home-types";

type BankConnectionsPanelProps = {
  cards: BankInstitutionCard[];
};

export function BankConnectionsPanel({ cards }: BankConnectionsPanelProps) {
  return <BankInstitutionCards cards={cards} />;
}
