import { describe, expect, it } from "vitest";

import { buildBankCards } from "./buildBankCards";

describe("buildBankCards", () => {
  it("makes the beta Trade Republic AIS integration connectable", () => {
    const cards = buildBankCards({
      connectionsResult: { ok: true, value: [] },
      institutionsResult: {
        ok: true,
        value: [
          {
            name: "Trade Republic",
            country: "ES",
            beta: true,
            maximumConsentValidity: 90 * 24 * 60 * 60
          }
        ]
      },
      providerStatus: { status: "success", applicationName: "Money Juggle" }
    });

    expect(cards.find((card) => card.slug === "trade-republic")).toMatchObject({
      provider: "enable_banking",
      balanceLabel: "Efectivo",
      beta: true,
      aspspName: "Trade Republic",
      country: "ES",
      state: "idle",
      tooltip:
        "Trade Republic disponible en Enable Banking como integración beta."
    });
  });

  it("keeps Trade Republic unavailable when the ASPSP is absent", () => {
    const cards = buildBankCards({
      connectionsResult: { ok: true, value: [] },
      institutionsResult: { ok: true, value: [] },
      providerStatus: { status: "success", applicationName: "Money Juggle" }
    });

    expect(cards.find((card) => card.slug === "trade-republic")).toMatchObject({
      state: "unavailable"
    });
  });
});
