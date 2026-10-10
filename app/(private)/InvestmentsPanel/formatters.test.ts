import { describe, expect, it } from "vitest";
import { formatPortfolioDate, formatPortfolioTooltipDate } from "./formatters";

describe("portfolio date formatters", () => {
  it("formats report dates and axis timestamps in UTC", () => {
    expect(formatPortfolioDate("2026-10-10")).toBe("10 oct 2026");
    expect(formatPortfolioDate(Date.parse("2026-10-10T00:00:00Z"))).toBe(
      "10 oct 2026"
    );
  });

  it.each([NaN, Infinity, 1e20, "invalid"])(
    "handles invalid date input %s without throwing",
    (value) => {
      expect(formatPortfolioDate(value)).toBe("Fecha no disponible");
    }
  );

  it.each(["Efectivo", "Inversiones", undefined])(
    "uses the report date from the point instead of tooltip label %s",
    (label) => {
      expect(
        formatPortfolioTooltipDate(label, [{ payload: { date: "2026-10-10" } }])
      ).toBe("10 oct 2026");
    }
  );

  it("handles missing or invalid tooltip dates", () => {
    expect(formatPortfolioTooltipDate("Efectivo", [])).toBe(
      "Fecha no disponible"
    );
    expect(formatPortfolioTooltipDate("Efectivo", [{}])).toBe(
      "Fecha no disponible"
    );
    expect(
      formatPortfolioTooltipDate("Efectivo", [{ payload: { date: "invalid" } }])
    ).toBe("Fecha no disponible");
  });
});
