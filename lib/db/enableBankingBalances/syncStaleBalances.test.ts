import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BankConnectionSummary } from "@/definitions";
const mocks = vi.hoisted(() => ({ sync: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./syncConnectionBalances", () => ({
  syncEnableBankingConnectionBalances: mocks.sync
}));
import { syncStaleEnableBankingBalances } from "./syncStaleBalances";
import { BalanceSyncUnavailableError } from "./syncError";

const connection: BankConnectionSummary = {
  id: "caixa",
  status: "linked",
  consent_expires_at: null,
  created_at: "2026-10-04T00:00:00Z",
  updated_at: "2026-10-04T00:00:00Z",
  institution: { name: "CaixaBank", country: "ES", logo_url: null },
  accounts: [
    {
      id: "account",
      name: "Cuenta",
      currency: "EUR",
      iban_last4: null,
      account_type: null,
      status: "active",
      latest_balance: null
    }
  ]
};
const input = { userId: "owner", connections: [connection], force: true };
describe("balance sync feedback", () => {
  beforeEach(() => vi.clearAllMocks());
  it("keeps partial balance account failures visible despite receiving other balances", async () => {
    mocks.sync.mockResolvedValue({ status: "completed", partialFailure: true });
    await expect(syncStaleEnableBankingBalances(input)).resolves.toMatchObject({
      succeededConnectionCount: 1,
      partialConnectionCount: 1,
      issues: [
        { bankConnectionId: "caixa", resource: "balances", kind: "error" }
      ]
    });
  });
  it("reports existing rate-limit cooldown as deferred", async () => {
    mocks.sync.mockResolvedValue({
      status: "rate-limited",
      cooldownUntil: "2026-10-04T18:55:00Z"
    });
    await expect(syncStaleEnableBankingBalances(input)).resolves.toMatchObject({
      failedConnectionCount: 0,
      cooldownConnectionCount: 1,
      issues: [
        {
          bankConnectionId: "caixa",
          kind: "deferred",
          retryAt: "2026-10-04T18:55:00Z"
        }
      ]
    });
  });
  it("preserves genuine balance fetch failures", async () => {
    mocks.sync.mockRejectedValue(new BalanceSyncUnavailableError(false));
    await expect(syncStaleEnableBankingBalances(input)).resolves.toMatchObject({
      failedConnectionCount: 1,
      issues: [
        { bankConnectionId: "caixa", resource: "balances", kind: "error" }
      ]
    });
  });
  it("does not create a notice after a complete success", async () => {
    mocks.sync.mockResolvedValue({
      status: "completed",
      partialFailure: false
    });
    await expect(syncStaleEnableBankingBalances(input)).resolves.toMatchObject({
      issues: []
    });
  });
});
