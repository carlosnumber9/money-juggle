import type { MonthlyTransactionSummary } from "@/definitions";
import { describe, expect, it } from "vitest";

import { isInternalTransfer } from "./internalTransfers";

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
