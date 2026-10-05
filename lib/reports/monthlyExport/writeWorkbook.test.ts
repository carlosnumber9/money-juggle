import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { buildMonthlyExportReport } from "./buildReport";
import {
  reportCategory,
  reportData,
  reportTransaction,
  REPORT_MONTH,
  REPORT_NOW
} from "./fixtures.testSupport";
import { writeMonthlyWorkbook } from "./writeWorkbook";

describe("monthly XLSX contract", () => {
  it("writes three stable sheets with numeric money, real dates, and no raw transaction data", async () => {
    const report = buildMonthlyExportReport(
      reportData({
        transactions: [
          reportTransaction({
            id: "salary-secret",
            amount: "2000",
            category: reportCategory("salary", true)
          }),
          reportTransaction({ id: "purchase-secret", amount: "-100" }),
          reportTransaction({ id: "refund-secret", amount: "40" })
        ]
      }),
      REPORT_MONTH,
      REPORT_NOW
    );
    const files = unzipSync(await writeMonthlyWorkbook(report));
    const workbook = strFromU8(files["xl/workbook.xml"]);
    const xml = Object.values(files)
      .map((file) => strFromU8(file))
      .join("\n");
    expect(workbook).toContain('name="Resumen"');
    expect(workbook).toContain('name="Categorías"');
    expect(workbook).toContain('name="Cuentas"');
    expect(
      Object.keys(files).filter((name) =>
        /^xl\/worksheets\/sheet\d+\.xml$/.test(name)
      )
    ).toHaveLength(3);
    expect(xml).toContain("Ingresos netos");
    expect(xml).toContain("Saldo neto");
    expect(xml).toContain("Primer saldo disponible");
    expect(xml).toContain("Europe/Madrid");
    expect(strFromU8(files["xl/worksheets/sheet1.xml"])).toMatch(
      /<v>2000<\/v>/
    );
    expect(strFromU8(files["xl/worksheets/sheet2.xml"])).toMatch(/<v>60<\/v>/);
    const monthSerial =
      (Date.UTC(2026, 8, 1) - Date.UTC(1899, 11, 30)) / 86_400_000;
    expect(strFromU8(files["xl/worksheets/sheet1.xml"])).toContain(
      `<v>${monthSerial}</v>`
    );
    expect(strFromU8(files["xl/styles.xml"])).toContain("dd/mm/yyyy");
    expect(xml).not.toContain("mergeCells");
    expect(xml).not.toContain("<f>");
    for (const secret of [
      "salary-secret",
      "purchase-secret",
      "refund-secret",
      "account-a",
      "connection-a",
      "provider-secret",
      "secret-purchase-description",
      "secret-merchant",
      "secret-counterparty"
    ])
      expect(xml).not.toContain(secret);
    expect(strFromU8(files["xl/worksheets/sheet3.xml"])).not.toMatch(
      /r="D2"[^>]*><v>0<\/v>/
    );
  });

  it("treats owner-controlled names as literal text, not spreadsheet formulas", async () => {
    const category = reportCategory();
    category.name = '=HYPERLINK("https://example.test")';
    const report = buildMonthlyExportReport(
      reportData({ transactions: [reportTransaction({ category })] }),
      REPORT_MONTH,
      REPORT_NOW
    );
    const xml = Object.values(unzipSync(await writeMonthlyWorkbook(report)))
      .map((file) => strFromU8(file))
      .join(" ");
    expect(xml).toContain("HYPERLINK");
    expect(xml).not.toContain("<f>");
  });

  it("fails instead of rounding amounts outside supported Excel precision", async () => {
    const report = buildMonthlyExportReport(
      reportData({
        transactions: [reportTransaction({ amount: "-1000000000000000" })]
      }),
      REPORT_MONTH,
      REPORT_NOW
    );
    await expect(writeMonthlyWorkbook(report)).rejects.toThrow(
      "Excel numeric precision"
    );
  });
});
