import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/enableBankingConnections/accountReview", () => ({
  loadBankAccountReview: mocks.load
}));
import { bankingDataSource } from "./bankingDataSource";

describe("bank account review view projection", () => {
  it("only exposes display fields and opaque review identity to the browser", async () => {
    mocks.load.mockResolvedValue({
      pending: {
        reviewId: "opaque-review",
        expiresAt: "2099-01-01T00:00:00Z",
        session: {
          session_id: "secret-session",
          aspsp: { name: "CaixaBank" },
          accounts: [
            {
              uid: "provider-account",
              identification_hash: "provider-hash",
              currency: "EUR",
              name: "Cuenta nueva"
            }
          ]
        },
        identifiers: [
          { iban_last4: "1234", iban_fingerprint: "secret-fingerprint" }
        ]
      },
      connection: {
        provider_state: "secret-state",
        provider_metadata: { secret: "metadata" },
        accounts: [
          {
            id: "internal-id",
            name: "Cuenta guardada",
            currency: "EUR",
            iban_last4: "1234"
          }
        ]
      }
    });
    const result = await bankingDataSource.getBankAccountReview(
      "owner",
      "connection"
    );
    expect(result).toEqual({
      reviewId: "opaque-review",
      institutionName: "CaixaBank",
      expiresAt: "2099-01-01T00:00:00Z",
      returnedAccounts: [
        { name: "Cuenta nueva", currency: "EUR", ibanLast4: "1234" }
      ],
      storedAccounts: [
        {
          id: "internal-id",
          name: "Cuenta guardada",
          currency: "EUR",
          ibanLast4: "1234"
        }
      ]
    });
    const serialized = JSON.stringify(result);
    for (const secret of [
      "secret-session",
      "provider-account",
      "provider-hash",
      "secret-fingerprint",
      "secret-state",
      "metadata"
    ])
      expect(serialized).not.toContain(secret);
  });
});
