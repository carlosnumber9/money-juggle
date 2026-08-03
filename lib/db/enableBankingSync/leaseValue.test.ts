import { describe, expect, it } from "vitest";

import { getSyncLeaseUntil } from "./leaseValue";

describe("getSyncLeaseUntil", () => {
  it("creates a short self-expiring lease", () => {
    expect(getSyncLeaseUntil(new Date("2026-08-03T12:00:00.000Z"))).toBe(
      "2026-08-03T12:10:00.000Z"
    );
  });
});
