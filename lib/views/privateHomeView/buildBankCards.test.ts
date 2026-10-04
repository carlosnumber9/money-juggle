import { afterEach, describe, expect, it, vi } from "vitest";

import type { BankConnectionSummary } from "@/definitions";

import { buildBankCards } from "./buildBankCards";

describe("buildBankCards", () => {
  afterEach(() => vi.useRealTimers());
  it.each(["expired", "revoked", "linked"])(
    "offers reconnection for %s consent while preserving prepared account data",
    (status) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-04T16:00:00Z"));
      const cards = buildBankCards({
        connectionsResult: {
          ok: true,
          value: [
            {
              id: "existing-connection",
              status,
              consent_expires_at: "2026-10-04T15:00:00Z",
              created_at: "2026-07-01T00:00:00Z",
              updated_at: "2026-10-04T15:00:00Z",
              institution: { name: "ING", country: "ES", logo_url: null },
              accounts: [
                {
                  id: "existing-account",
                  name: "Cuenta",
                  currency: "EUR",
                  iban_last4: "1234",
                  account_type: null,
                  status: "active",
                  latest_balance: null
                }
              ]
            }
          ]
        }
      });
      expect(cards.find((card) => card.slug === "ing")).toMatchObject({
        state: "reconnection-required",
        bankConnectionId: "existing-connection",
        aspspName: "ING",
        country: "ES",
        accounts: [expect.objectContaining({ id: "existing-account" })]
      });
    }
  );
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

  it("makes a linked Trade Republic session without accounts retryable", () => {
    const cards = buildBankCards({
      connectionsResult: {
        ok: true,
        value: [
          {
            id: "connection-1",
            status: "linked",
            consent_expires_at: "2026-11-10T17:37:10.552Z",
            created_at: "2026-08-12T17:37:11.545Z",
            updated_at: "2026-08-12T17:39:02.209Z",
            institution: {
              name: "Trade Republic",
              country: "ES",
              logo_url: null
            },
            accounts: []
          } satisfies BankConnectionSummary
        ]
      },
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
      state: "error",
      aspspName: "Trade Republic",
      country: "ES",
      tooltip:
        "Trade Republic no devolvió ninguna cuenta autorizada. Puedes reintentar la conexión."
    });
  });
});
