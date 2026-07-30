import type { MonthlyTransactionSummary } from "@/definitions";
import { describe, expect, it } from "vitest";

import {
  isAutomaticallyDetectedInternalTransfer,
  isTransactionExcludedFromMetrics
} from "./transactionMetrics";

describe("transaction metrics", () => {
  it("excludes automatically detected internal transfers", () => {
    const transaction = createMetricCandidate({
      cashflow_type: "internal_transfer",
      category: createCategory("groceries")
    });

    expect(isAutomaticallyDetectedInternalTransfer(transaction)).toBe(true);
    expect(isTransactionExcludedFromMetrics(transaction)).toBe(true);
  });

  it("excludes transactions assigned to the internal transfer category", () => {
    const transaction = createMetricCandidate({
      category: createCategory("internal_transfer")
    });

    expect(isAutomaticallyDetectedInternalTransfer(transaction)).toBe(false);
    expect(isTransactionExcludedFromMetrics(transaction)).toBe(true);
  });

  it("keeps regular categorized transactions in metrics", () => {
    const transaction = createMetricCandidate({
      category: createCategory("groceries")
    });

    expect(isAutomaticallyDetectedInternalTransfer(transaction)).toBe(false);
    expect(isTransactionExcludedFromMetrics(transaction)).toBe(false);
  });
});

function createMetricCandidate(
  overrides: Partial<
    Pick<MonthlyTransactionSummary, "cashflow_type" | "category">
  > = {}
): Pick<MonthlyTransactionSummary, "cashflow_type" | "category"> {
  return {
    cashflow_type: "external",
    category: null,
    ...overrides
  };
}

function createCategory(
  slug: string
): NonNullable<MonthlyTransactionSummary["category"]> {
  return {
    id: slug,
    name: slug,
    slug,
    group: {
      id: "group",
      name: "Grupo"
    }
  };
}
