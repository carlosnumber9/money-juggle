import type { MonthlyTransactionSummary } from "@/definitions";
import { describe, expect, it } from "vitest";

import {
  getInternalTransferMatchingRange,
  isBookingDateInRange,
  isInternalTransfer
} from "./internalTransfers";

describe("isInternalTransfer", () => {
  it("accepts provider-detected and manually categorized transfers", () => {
    expect(
      isInternalTransfer({ cashflow_type: "internal_transfer", category: null })
    ).toBe(true);
    expect(
      isInternalTransfer({
        cashflow_type: "external",
        category: createCategory("internal_transfer")
      })
    ).toBe(true);
  });

  it("keeps external transactions financially reportable", () => {
    expect(
      isInternalTransfer({
        cashflow_type: "external",
        category: createCategory("groceries")
      })
    ).toBe(false);
  });
});

describe("internal transfer matching range", () => {
  it("loads three context days across month and year boundaries", () => {
    expect(
      getInternalTransferMatchingRange({
        from: "2026-01-01",
        to: "2026-02-01"
      })
    ).toEqual({
      from: "2025-12-29",
      to: "2026-02-04"
    });
  });

  it("keeps only transactions from the requested report range", () => {
    const range = { from: "2026-05-01", to: "2026-06-01" };

    expect(isBookingDateInRange("2026-05-31", range)).toBe(true);
    expect(isBookingDateInRange("2026-06-01", range)).toBe(false);
    expect(isBookingDateInRange(null, range)).toBe(false);
  });
});

function createCategory(
  slug: string
): NonNullable<MonthlyTransactionSummary["category"]> {
  return {
    id: slug,
    name: slug,
    slug,
    group: {
      id: "group",
      name: "Group"
    }
  };
}
