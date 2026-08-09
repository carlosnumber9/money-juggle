import { describe, expect, it } from "vitest";

import { isValidReportingDate } from "./transactionDates";

describe("isValidReportingDate", () => {
  it("accepts real ISO calendar dates without imposing a time range", () => {
    expect(isValidReportingDate("2024-02-29")).toBe(true);
    expect(isValidReportingDate("1999-12-31")).toBe(true);
    expect(isValidReportingDate("2099-01-01")).toBe(true);
  });

  it("rejects malformed and impossible dates", () => {
    expect(isValidReportingDate("2026-2-09")).toBe(false);
    expect(isValidReportingDate("2026-02-30")).toBe(false);
    expect(isValidReportingDate("0000-01-01")).toBe(false);
    expect(isValidReportingDate("not-a-date")).toBe(false);
  });
});
