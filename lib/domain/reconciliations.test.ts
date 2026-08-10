import { describe, expect, it } from "vitest";

import type { SaveTransactionReconciliationInput } from "@/definitions";

import { isValidSaveTransactionReconciliationInput } from "./reconciliations";

const FIRST_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_ID = "22222222-2222-4222-8222-222222222222";
const CATEGORY_ID = "33333333-3333-4333-8333-333333333333";

function createInput(
  overrides: Partial<SaveTransactionReconciliationInput> = {}
): SaveTransactionReconciliationInput {
  return {
    reconciliationId: null,
    sourceTransactionId: FIRST_ID,
    kind: "debt",
    note: null,
    transactionIds: [FIRST_ID, SECOND_ID],
    expectedBalance: "0",
    difference: { treatment: "none" },
    ...overrides
  };
}

describe("reconciliation input validation", () => {
  it("accepts a balanced group with two distinct movements", () => {
    expect(isValidSaveTransactionReconciliationInput(createInput())).toBe(true);
  });

  it("requires the source movement during creation", () => {
    expect(
      isValidSaveTransactionReconciliationInput(
        createInput({ sourceTransactionId: CATEGORY_ID })
      )
    ).toBe(false);
  });

  it("requires a note for other groups", () => {
    expect(
      isValidSaveTransactionReconciliationInput(
        createInput({ kind: "other", note: " " })
      )
    ).toBe(false);
  });

  it("requires treatment metadata for a reportable difference", () => {
    expect(
      isValidSaveTransactionReconciliationInput(
        createInput({
          expectedBalance: "-0.1",
          difference: {
            treatment: "reportable",
            categoryId: CATEGORY_ID,
            reportingDate: "2026-08-10",
            labelIds: [],
            newLabelNames: []
          }
        })
      )
    ).toBe(true);
  });

  it("rejects none for a non-zero balance", () => {
    expect(
      isValidSaveTransactionReconciliationInput(
        createInput({ expectedBalance: "0.1" })
      )
    ).toBe(false);
  });
});
