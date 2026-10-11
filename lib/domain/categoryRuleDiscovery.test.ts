import { describe, expect, it } from "vitest";
import type { CategoryRuleTransaction } from "@/definitions";
import { buildRuleProposals, ruleDiscoveryText } from "./categoryRuleDiscovery";
const rows: CategoryRuleTransaction[] = [
  "2026-08-02",
  "2026-09-02",
  "2026-10-02"
].map((date, index) => ({
  id: `t${index}`,
  account_id: "a1",
  booking_status: "booked",
  booking_date: date,
  first_seen_at: `${date}T12:00:00Z`,
  amount: "-10",
  currency: "EUR",
  description: `Netflix ${date}`,
  merchant_name: "Netflix",
  counterparty_name: null,
  category_id: "c1",
  category_source: "manual",
  excluded: false
}));
const vectors = (values: CategoryRuleTransaction[]) =>
  new Map(values.map((row) => [ruleDiscoveryText(row), [1, 0]]));
describe("rule discovery", () => {
  it("uses confirmed history to propose exact merchant rules", () => {
    const result = buildRuleProposals(rows, vectors(rows), "revision");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      categoryId: "c1",
      condition: {
        field: "merchant_name",
        operator: "equals",
        value: "netflix",
        account_id: null
      },
      evidence: { months: 3 }
    });
  });
  it("surfaces contradictory manual categories", () => {
    const values = rows.map((row, index) => ({
      ...row,
      category_id: index === 0 ? "c2" : "c1"
    }));
    expect(
      buildRuleProposals(values, vectors(values), "r")[0].categoryId
    ).toBeNull();
  });
  it("requires three months and never learns from rule assignments", () => {
    expect(buildRuleProposals(rows.slice(0, 2), vectors(rows), "r")).toEqual(
      []
    );
    expect(
      buildRuleProposals(
        rows.map((row) => ({ ...row, category_source: "rule" })),
        vectors(rows),
        "r"
      )
    ).toEqual([]);
    const values = rows.map((row, index) => ({
      ...row,
      category_source: index === 0 ? ("manual" as const) : ("rule" as const)
    }));
    expect(buildRuleProposals(values, vectors(values), "r")).toEqual([]);
  });
  it("excludes neutral movements and separates currencies", () => {
    expect(
      buildRuleProposals(
        rows.map((row) => ({ ...row, excluded: true })),
        vectors(rows),
        "r"
      )
    ).toEqual([]);
    expect(
      buildRuleProposals(
        rows.map((row, index) => ({
          ...row,
          currency: index === 0 ? "USD" : "EUR"
        })),
        vectors(rows),
        "r"
      )
    ).toEqual([]);
  });
  it("does not combine different merchants without a stable condition", () => {
    const values = rows.map((row, index) => ({
      ...row,
      merchant_name: `store ${index}`,
      description: `concept${index}`
    }));
    expect(buildRuleProposals(values, vectors(values), "r")).toEqual([]);
  });
  it("checks the bounded computation deadline", () =>
    expect(() => buildRuleProposals(rows, vectors(rows), "r", 0)).toThrow(
      "time budget"
    ));
});
