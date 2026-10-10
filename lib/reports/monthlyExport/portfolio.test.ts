import { describe, expect, it } from "vitest";
import { buildReportPortfolio } from "./portfolio";
import { buildMonthlyExportReport } from "./buildReport";
import {
  reportData,
  reportPortfolio,
  REPORT_MONTH,
  REPORT_NOW
} from "./fixtures.testSupport";

describe("monthly portfolio observations", () => {
  it("preserves declared valuations, exact totals and actual dates while sorting positions", () => {
    const source = reportPortfolio();
    const result = buildReportPortfolio(source, "2026-10-01");
    expect(result).toMatchObject({
      reportDate: "2026-09-20",
      investments: "0.3",
      positions: [{ value: "0.2", priceDate: "2026-09-18" }, { value: "0.1" }]
    });
    expect(source.positions[0].value).toBe("0.1");
    expect(result?.observations).toContain("no corresponde al cierre exacto");
    expect(result).not.toHaveProperty("cash");
    expect(result).not.toHaveProperty("id");
  });
  it.each(["2026-08-20", "2026-09-30"])(
    "allows report date %s and keeps economic and bank totals unchanged",
    (reportDate) => {
      const baseline = buildMonthlyExportReport(
        reportData(),
        REPORT_MONTH,
        REPORT_NOW
      );
      const report = buildMonthlyExportReport(
        reportData({ portfolio: reportPortfolio({ reportDate }) }),
        REPORT_MONTH,
        REPORT_NOW
      );
      expect(report.portfolio?.reportDate).toBe(reportDate);
      expect(report.totals).toEqual(baseline.totals);
      expect(report.accounts).toEqual(baseline.accounts);
      expect(report.categories).toEqual(baseline.categories);
    }
  );
  it("recognizes a month-end observation across leap-year boundaries", () => {
    expect(
      buildReportPortfolio(
        reportPortfolio({ reportDate: "2024-02-29" }),
        "2024-03-01"
      )?.observations
    ).toContain("último día del mes");
  });
  it("does not invent an observation when none is available", () => {
    expect(buildReportPortfolio(null, "2026-10-01")).toBeNull();
  });
  it("rejects a later snapshot and mismatched valuations", () => {
    expect(() =>
      buildReportPortfolio(
        reportPortfolio({ reportDate: "2026-10-01" }),
        "2026-10-01"
      )
    ).toThrow("after the report period");
    expect(() =>
      buildReportPortfolio(
        reportPortfolio({ investments: "0.31" }),
        "2026-10-01"
      )
    ).toThrow("does not match its positions");
  });
});
