import type { BankInstitutionCard } from "@/definitions";

export function getLinkingStaleDelay(
  card: BankInstitutionCard,
  now = Date.now()
): number | null {
  if (card.state !== "linking" || !card.linkingStaleAt) {
    return null;
  }

  const staleAt = Date.parse(card.linkingStaleAt);

  return Number.isFinite(staleAt) ? Math.max(0, staleAt - now) : null;
}

export function markLinkingCardStale(
  card: BankInstitutionCard
): BankInstitutionCard {
  return {
    ...card,
    state: "stale-linking",
    tooltip: `La conexión con ${card.name} parece atascada. Puedes reintentarla.`
  };
}
