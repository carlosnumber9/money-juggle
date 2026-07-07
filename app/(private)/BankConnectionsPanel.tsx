import { BankInstitutionCards } from "@/app/(private)/BankInstitutionCards";
import type { BankConnectionsPanelProps } from "@/definitions";

export function BankConnectionsPanel({ cards }: BankConnectionsPanelProps) {
  return <BankInstitutionCards cards={cards} />;
}
