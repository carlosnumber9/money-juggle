import { describe, expect, it } from "vitest";
import { getInvalidSessionState, hasExpiredConsent } from "./sessionStatus";

describe("bank session lifecycle", () => {
  it.each([
    ["EXPIRED_SESSION", "expired"],
    ["CLOSED_SESSION", "expired"],
    ["REVOKED_SESSION", "revoked"]
  ])("requires reauthorization for %s", (code, state) =>
    expect(getInvalidSessionState(code)).toBe(state)
  );
  it.each([
    undefined,
    "UNAUTHORIZED_ACCESS",
    "ASPSP_ERROR",
    "ASPSP_RATE_LIMIT_EXCEEDED"
  ])("does not invalidate bank consent for %s", (code) =>
    expect(getInvalidSessionState(code)).toBeNull()
  );
  it("expires exactly at the stored deadline", () => {
    const now = new Date("2026-10-04T16:00:00Z");
    expect(hasExpiredConsent("2026-10-04T16:00:00Z", now)).toBe(true);
    expect(hasExpiredConsent("2026-10-04T16:00:01Z", now)).toBe(false);
    expect(hasExpiredConsent("invalid", now)).toBe(false);
    expect(hasExpiredConsent(null, now)).toBe(false);
  });
});
