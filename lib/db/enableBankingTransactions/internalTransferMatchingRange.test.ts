import { describe, expect, it } from "vitest";

import { getInternalTransferMatchingRange } from "./internalTransferMatchingRange";

describe("getInternalTransferMatchingRange", () => {
  it("loads three context days around bank dates across a year boundary", () => {
    expect(
      getInternalTransferMatchingRange([
        { booking_date: "2026-01-01" },
        { booking_date: "2026-01-03" }
      ])
    ).toEqual({
      from: "2025-12-29",
      to: "2026-01-07"
    });
  });

  it("returns no candidate range when every bank date is missing", () => {
    expect(
      getInternalTransferMatchingRange([{ booking_date: null }])
    ).toBeNull();
  });
});
