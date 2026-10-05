import { describe, expect, it } from "vitest";
import { getDefaultReportName, getReportDownloadName } from "./fileName";

describe("monthly export filename", () => {
  it("uses the selected month and a single XLSX extension", () => {
    expect(getDefaultReportName("2026-09")).toBe("Finanzas-2026-09");
    expect(getReportDownloadName(" Mi informe.xlsx.xlsx ")).toBe(
      "Mi informe.xlsx"
    );
    expect(getReportDownloadName("Finanzas-2026-09")).toBe(
      "Finanzas-2026-09.xlsx"
    );
  });
  it("rejects empty names, path separators, control characters and oversized names", () => {
    for (const value of [
      "",
      "   ",
      ".xlsx",
      "../informe",
      "folder\\informe",
      "bad\nname",
      "a".repeat(121)
    ])
      expect(getReportDownloadName(value)).toBeNull();
  });
});
