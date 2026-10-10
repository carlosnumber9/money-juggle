import { expect, it } from "vitest";
import { getPortfolioReview } from "./review";
const original = {
  reportDate: "2026-10-10",
  currency: "EUR" as const,
  cash: "0.6",
  positions: [],
  reportedInvestments: "0",
  reportedTotal: "0.6"
};
it("detects corrections and source mismatches with exact arithmetic", () => {
  expect(getPortfolioReview(original, original)).toMatchObject({
    valid: true,
    changed: false,
    mismatch: false,
    total: "0.6"
  });
  expect(
    getPortfolioReview({ ...original, cash: "0.7" }, original)
  ).toMatchObject({ changed: true, total: "0.7" });
  expect(
    getPortfolioReview(original, { ...original, reportedTotal: "0.600001" })
      .mismatch
  ).toBe(true);
});
it("prevents confirmation when a corrected value is incomplete", () => {
  expect(getPortfolioReview({ ...original, cash: "" }, original).valid).toBe(
    false
  );
});
