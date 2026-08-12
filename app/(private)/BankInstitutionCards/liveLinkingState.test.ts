import type { BankInstitutionCard } from "@/definitions";
import { describe, expect, it } from "vitest";

import { getLinkingStaleDelay, markLinkingCardStale } from "./liveLinkingState";

describe("live linking state", () => {
  it("returns the remaining delay for an active linking card", () => {
    expect(
      getLinkingStaleDelay(
        createLinkingCard("2026-08-12T10:15:00.000Z"),
        Date.parse("2026-08-12T10:10:00.000Z")
      )
    ).toBe(5 * 60 * 1000);
  });

  it("expires immediately when the stale deadline has passed", () => {
    expect(
      getLinkingStaleDelay(
        createLinkingCard("2026-08-12T10:15:00.000Z"),
        Date.parse("2026-08-12T10:16:00.000Z")
      )
    ).toBe(0);
  });

  it("turns an expired card into a retryable stale state", () => {
    expect(
      markLinkingCardStale(createLinkingCard("2026-08-12T10:15:00.000Z"))
    ).toMatchObject({
      state: "stale-linking",
      tooltip:
        "La conexión con Trade Republic parece atascada. Puedes reintentarla."
    });
  });
});

function createLinkingCard(linkingStaleAt: string): BankInstitutionCard {
  return {
    slug: "trade-republic",
    name: "Trade Republic",
    logoPath: "/assets/institutions/trade-republic.svg",
    provider: "enable_banking",
    aspspName: "Trade Republic",
    country: "ES",
    linkingStaleAt,
    state: "linking",
    tooltip: "Conexión con Trade Republic en curso."
  };
}
