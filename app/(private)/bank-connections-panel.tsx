import { BankInstitutionCards } from "@/app/(private)/bank-institution-cards";
import type { BankConnectionsPanelProps } from "@/definitions";

export function BankConnectionsPanel({ cards }: BankConnectionsPanelProps) {
  return <BankInstitutionCards cards={cards} />;
}
