import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/shared/accountFingerprint", () => ({
  getAccountFingerprint: () => "a".repeat(64)
}));
import {
  preparePendingReconnection,
  readPendingReconnection
} from "./pendingSession";

const now = new Date("2026-10-04T12:00:00Z");
const input = {
  userId: "owner",
  bankConnectionId: "connection",
  session: {
    session_id: "private-session",
    aspsp: { name: "CaixaBank", country: "ES" },
    psu_type: "personal",
    access: { valid_until: "2026-10-04T13:00:00Z" },
    accounts: [
      {
        uid: "private-uid",
        currency: "EUR",
        identification_hash: "stable",
        account_id: { iban: "ES0000000000000000001234" },
        all_account_ids: [{ identification: "raw-number" }],
        details: "raw-details"
      }
    ]
  }
};
describe("pending account review", () => {
  it("retains server session data without persisting raw bank account numbers", () => {
    const pending = preparePendingReconnection(input, now);
    expect(pending.identifiers).toEqual([
      { iban_fingerprint: "a".repeat(64), iban_last4: "1234" }
    ]);
    expect(JSON.stringify(pending)).not.toContain("ES0000000000000000001234");
    expect(JSON.stringify(pending)).not.toContain("raw-number");
    expect(JSON.stringify(pending)).not.toContain("raw-details");
    expect(readPendingReconnection(pending, now)?.session.session_id).toBe(
      "private-session"
    );
  });
  it("rejects an expired review and expired consent", () => {
    const pending = preparePendingReconnection(input, now);
    expect(
      readPendingReconnection(pending, new Date("2026-10-04T12:15:00Z"))
    ).toBeNull();
    expect(
      readPendingReconnection(
        {
          ...pending,
          session: {
            ...pending.session,
            access: { valid_until: "2026-10-04T11:00:00Z" }
          }
        },
        now
      )
    ).toBeNull();
  });
  it("rejects a malformed or incomplete pending session", () => {
    expect(readPendingReconnection({}, now)).toBeNull();
    const pending = preparePendingReconnection(input, now);
    expect(
      readPendingReconnection({ ...pending, identifiers: [] }, now)
    ).toBeNull();
  });
});
