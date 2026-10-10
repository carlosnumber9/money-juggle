import { describe, expect, it } from "vitest";
import { portfolioInvestments, validatePortfolioValues } from "./values";

const values = {
  reportDate: "2026-10-10",
  currency: "EUR",
  cash: "0.60",
  positions: [
    {
      name: " Synthetic fund ",
      isin: "IE00B4L5Y983",
      quantity: "10.199032",
      price: "131.26",
      priceDate: "2026-10-09",
      value: "1338.67"
    }
  ]
};

describe("portfolio values", () => {
  it("preserves reported values and fractional units without float arithmetic", () => {
    const normalized = validatePortfolioValues(values);
    expect(normalized.cash).toBe("0.6");
    expect(normalized.positions[0].quantity).toBe("10.199032");
    expect(normalized.positions[0].name).toBe("Synthetic fund");
    expect(portfolioInvestments(normalized)).toBe("1338.67");
  });
  it.each([
    { reportDate: "2026-02-30" },
    { currency: "USD" },
    { cash: "NaN" },
    { cash: "100000000000000" },
    { positions: [...values.positions, ...values.positions] },
    { positions: [{ ...values.positions[0], priceDate: "2026-10-11" }] },
    { positions: [{ ...values.positions[0], quantity: "0.1234567" }] },
    { positions: [{ ...values.positions[0], value: "-1" }] }
  ])("rejects invalid fields: %j", (changes) => {
    expect(() => validatePortfolioValues({ ...values, ...changes })).toThrow();
  });
  it("allows an empty liquidated portfolio", () => {
    expect(
      portfolioInvestments(
        validatePortfolioValues({ ...values, positions: [] })
      )
    ).toBe("0");
  });
});
