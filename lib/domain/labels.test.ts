import { describe, expect, it } from "vitest";

import {
  cleanTransactionLabelName,
  filterAvailableTransactionLabels,
  findExactTransactionLabel,
  getTransactionLabelSummaryText,
  isValidTransactionLabelName,
  normalizeTransactionLabelName
} from "./labels";

const LABELS = [
  { id: "one", name: "Viaje Lisboa 2026" },
  { id: "two", name: "Gastos compartidos" }
];

describe("transaction labels", () => {
  it("cleans whitespace and compares names case-insensitively", () => {
    expect(cleanTransactionLabelName("  Viaje   Lisboa 2026 ")).toBe(
      "Viaje Lisboa 2026"
    );
    expect(normalizeTransactionLabelName(" VIAJE lisboa 2026 ")).toBe(
      "viaje lisboa 2026"
    );
    expect(findExactTransactionLabel(LABELS, " viaje LISBOA 2026 ")).toEqual(
      LABELS[0]
    );
  });

  it("validates cleaned names between one and eighty characters", () => {
    expect(isValidTransactionLabelName("   ")).toBe(false);
    expect(isValidTransactionLabelName("Viaje")).toBe(true);
    expect(isValidTransactionLabelName("a".repeat(80))).toBe(true);
    expect(isValidTransactionLabelName("a".repeat(81))).toBe(false);
  });

  it("filters by search text and excludes assigned labels", () => {
    expect(
      filterAvailableTransactionLabels(LABELS, [LABELS[0]], "gastos")
    ).toEqual([LABELS[1]]);
    expect(
      filterAvailableTransactionLabels(LABELS, [LABELS[0]], "viaje")
    ).toEqual([]);
  });

  it("builds a compact summary from the first assigned label", () => {
    expect(getTransactionLabelSummaryText([])).toBeNull();
    expect(getTransactionLabelSummaryText([LABELS[0]])).toBe(
      "Viaje Lisboa 2026"
    );
    expect(getTransactionLabelSummaryText(LABELS)).toBe("Viaje Lisboa 2026 +1");
  });
});
