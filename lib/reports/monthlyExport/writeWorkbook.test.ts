import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { buildMonthlyExportReport } from "./buildReport";
import {
  reportCategory,
  reportData,
  reportPortfolio,
  reportTransaction,
  REPORT_MONTH,
  REPORT_NOW
} from "./fixtures.testSupport";
import { writeMonthlyWorkbook } from "./writeWorkbook";

describe("monthly XLSX contract", () => {
  it("writes four stable sheets with numeric money, real dates, and no raw transaction data", async () => {
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
    expect(workbook).toContain('name="Inversiones"');
    expect(
      Object.keys(files).filter((name) =>
        /^xl\/worksheets\/sheet\d+\.xml$/.test(name)
      )
    ).toHaveLength(4);
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

  it("writes declared investment valuations, numeric units, report and quote dates without cash or internal identifiers", async () => {
    const report = buildMonthlyExportReport(
      reportData({ portfolio: reportPortfolio() }),
      REPORT_MONTH,
      REPORT_NOW
    );
    const files = unzipSync(await writeMonthlyWorkbook(report));
    const sheet = strFromU8(files["xl/worksheets/sheet4.xml"]);
    const strings = strFromU8(files["xl/sharedStrings.xml"]);
    expect(sheet).toMatch(/r="B5"[^>]*><v>0.3<\/v>/);
    expect(sheet).toMatch(/r="C10"[^>]*><v>0.123456<\/v>/);
    expect(sheet).toMatch(/r="D10"[^>]*><v>1.62<\/v>/);
    expect(sheet).toMatch(/r="F10"[^>]*><v>0.2<\/v>/);
    const serial = (day: number) =>
      (Date.UTC(2026, 8, day) - Date.UTC(1899, 11, 30)) / 86_400_000;
    expect(sheet).toMatch(new RegExp(`r="B4"[^>]*><v>${serial(20)}</v>`));
    expect(sheet).toMatch(new RegExp(`r="E10"[^>]*><v>${serial(18)}</v>`));
    for (const header of [
      "Producto",
      "ISIN",
      "Unidades",
      "Precio unitario",
      "Fecha de cotización",
      "Valoración",
      "Moneda"
    ])
      expect(strings).toContain(header);
    const xml = Object.values(files)
      .map((file) => strFromU8(file))
      .join(" ");
    for (const secret of ["snapshot-secret", "revision-secret", "9876543.21"])
      expect(xml).not.toContain(secret);
    expect(xml).not.toContain("<f>");
  });

  it("keeps absent valuations blank and distinguishes a confirmed empty portfolio from no snapshot", async () => {
    const absent = unzipSync(
      await writeMonthlyWorkbook(
        buildMonthlyExportReport(reportData(), REPORT_MONTH, REPORT_NOW)
      )
    );
    expect(strFromU8(absent["xl/sharedStrings.xml"])).toContain(
      "Sin foto confirmada disponible"
    );
    expect(strFromU8(absent["xl/worksheets/sheet4.xml"])).not.toMatch(
      /r="B5"[^>]*><v>0<\/v>/
    );
    const empty = unzipSync(
      await writeMonthlyWorkbook(
        buildMonthlyExportReport(
          reportData({
            portfolio: reportPortfolio({ investments: "0", positions: [] })
          }),
          REPORT_MONTH,
          REPORT_NOW
        )
      )
    );
    expect(strFromU8(empty["xl/worksheets/sheet4.xml"])).toMatch(
      /r="B5"[^>]*><v>0<\/v>/
    );
    expect(strFromU8(empty["xl/sharedStrings.xml"])).toContain(
      "Foto confirmada disponible"
    );
  });

  it("exports product names and ISINs as literal text", async () => {
    const portfolio = reportPortfolio();
    portfolio.positions[0].name = '=HYPERLINK("https://example.test")';
    const files = unzipSync(
      await writeMonthlyWorkbook(
        buildMonthlyExportReport(
          reportData({ portfolio }),
          REPORT_MONTH,
          REPORT_NOW
        )
      )
    );
    const xml = Object.values(files)
      .map((file) => strFromU8(file))
      .join(" ");
    expect(xml).toContain("HYPERLINK");
    expect(xml).toContain("IE00B4L5Y983");
    expect(xml).not.toContain("<f>");
  });

  it.each(["quantity", "price", "value"] as const)(
    "rejects investment %s beyond Excel precision",
    async (field) => {
      const portfolio = reportPortfolio();
      portfolio.positions[0][field] = "1000000000000000";
      if (field === "value") portfolio.investments = "1000000000000000.2";
      const report = buildMonthlyExportReport(
        reportData({ portfolio }),
        REPORT_MONTH,
        REPORT_NOW
      );
      await expect(writeMonthlyWorkbook(report)).rejects.toThrow(
        "Excel numeric precision"
      );
    }
  );

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
