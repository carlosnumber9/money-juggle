import { describe, expect, it } from "vitest";
import type { CategoryRule, CategoryRuleTransaction } from "@/definitions";
import {
  evaluateCategoryRules,
  matchesCategoryRule,
  isCategoryRuleInput,
  normalizeRuleText
} from "./categoryRules";
const rule: CategoryRule = {
  id: "r1",
  name: "Netflix",
  user_id: "u1",
  field: "merchant_name",
  operator: "equals",
  value: "Netflix",
  currency: "EUR",
  direction: "expense",
  account_id: null,
  category_id: "c1",
  status: "active",
  activated_at: "2026-10-01T10:00:00Z",
  version: 1,
  proposal_key: null,
  evidence: null,
  created_at: "2026-10-01T10:00:00Z"
};
const row: CategoryRuleTransaction = {
  id: "t1",
  account_id: "a1",
  booking_status: "booked",
  booking_date: "2026-11-17",
  first_seen_at: "2026-11-18T10:00:00Z",
  amount: "-14.99",
  currency: "EUR",
  merchant_name: " NETFLIX ",
  counterparty_name: null,
  description: "Netflix premium",
  category_id: null,
  category_source: null,
  excluded: false
};
describe("category rules", () => {
  it("matches a future occurrence outside its discovery calendar", () =>
    expect(evaluateCategoryRules(row, [rule]).kind).toBe("assign"));
  it("protects assigned categories and manually cleared categories", () => {
    expect(
      evaluateCategoryRules({ ...row, category_id: "manual" }, [rule]).kind
    ).toBe("none");
    expect(
      evaluateCategoryRules({ ...row, category_source: "manual" }, [rule]).kind
    ).toBe("none");
  });
  it("excludes pending, neutral and historical imports", () => {
    for (const override of [
      { booking_status: "pending" as const },
      { excluded: true },
      { first_seen_at: "2026-09-01T00:00:00Z" },
      { booking_date: "2026-09-30" }
    ])
      expect(evaluateCategoryRules({ ...row, ...override }, [rule]).kind).toBe(
        "none"
      );
  });
  it("does not merge currencies, directions or restricted accounts", () => {
    expect(matchesCategoryRule(rule, { ...row, currency: "USD" })).toBe(false);
    expect(matchesCategoryRule(rule, { ...row, amount: "14.99" })).toBe(false);
    expect(matchesCategoryRule({ ...rule, account_id: "another" }, row)).toBe(
      false
    );
    expect(matchesCategoryRule(rule, { ...row, amount: "0" })).toBe(false);
  });
  it("rejects conflicting categories and uses oldest rule for equivalent matches", () => {
    expect(
      evaluateCategoryRules(row, [
        rule,
        { ...rule, id: "r2", category_id: "c2" }
      ]).kind
    ).toBe("conflict");
    expect(
      evaluateCategoryRules(row, [
        { ...rule, id: "r2", activated_at: "2026-10-02T00:00:00Z" },
        rule
      ])
    ).toEqual({ kind: "assign", rule });
  });
  it("pauses rules and preserves numeric identifiers", () => {
    expect(
      evaluateCategoryRules(row, [{ ...rule, status: "paused" }]).kind
    ).toBe("none");
    expect(normalizeRuleText("  RECIBO   123 ")).toBe("recibo 123");
    expect(
      matchesCategoryRule(
        { ...rule, field: "description", value: "recibo 124" },
        { ...row, description: "recibo 123" }
      )
    ).toBe(false);
  });
  it("supports explicitly approved description phrases", () =>
    expect(
      matchesCategoryRule(
        {
          ...rule,
          field: "description",
          operator: "contains",
          value: "Netflix"
        },
        row
      )
    ).toBe(true));
  it("validates action input instead of trusting unknown payloads", () => {
    const input = {
      ...rule,
      id: undefined,
      category_id: "f8000000-0000-4000-8000-000000000011"
    };
    expect(isCategoryRuleInput(input)).toBe(true);
    for (const v of [
      null,
      {},
      { ...input, name: undefined },
      { ...input, name: " " },
      { ...input, name: "a".repeat(301) },
      { ...input, operator: "contains" },
      { ...input, value: " " },
      { ...input, currency: "eur" },
      { ...input, category_id: "bad" },
      { ...input, id: "f8000000-0000-4000-8000-000000000030", version: 0 }
    ])
      expect(isCategoryRuleInput(v)).toBe(false);
  });
});
