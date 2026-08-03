import { describe, expect, it } from "vitest";

import { getActiveRateLimitCooldown } from "./rateLimitCooldownValue";

describe("getActiveRateLimitCooldown", () => {
  const now = new Date("2026-08-03T12:00:00.000Z");

  it("returns a future cooldown", () => {
    expect(getActiveRateLimitCooldown("2026-08-03T18:00:00.000Z", now)).toBe(
      "2026-08-03T18:00:00.000Z"
    );
  });

  it.each([null, "invalid", "2026-08-03T12:00:00.000Z"])(
    "ignores inactive value %s",
    (value) => {
      expect(getActiveRateLimitCooldown(value, now)).toBeNull();
    }
  );
});
