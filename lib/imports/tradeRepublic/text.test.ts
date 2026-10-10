import { describe, expect, it } from "vitest";
import {
  extractTradeRepublicText,
  parseSpanishDecimal,
  type PdfTextItem
} from "./text";
const item = (text: string, x: number, y: number): PdfTextItem => ({
  text,
  x,
  y
});
const header = (y: number) => [
  item("UNIDADES / NOMINAL", 74, y),
  item("NOMBRE DEL VALOR", 141, y),
  item("PRECIO POR UNIDAD", 365, y),
  item("VALOR EN EUR", 484, y)
];
const introduction = [
  item("TRADE REPUBLIC", 74, 800),
  item("EXTRACTO DEL PATRIMONIO NETO", 74, 700),
  item("a 10.10.2026", 74, 690),
  item("CARTERA", 74, 650),
  item("VALOR EN EUR", 484, 650),
  item("Cuenta de valores", 74, 640),
  item("1.000,03", 492, 640),
  item("Efectivo", 74, 630),
  item("0,60", 507, 630),
  item("TOTAL", 74, 620),
  item("1.000,63 EUR", 477, 620)
];
const firstRow = [
  item("10,199032 unidades Synthetic fund", 74, 580),
  item("131,26", 365, 580),
  item("999,99", 492, 580),
  item("continued name", 141, 572),
  item("ISIN: IE00B4L5Y983", 141, 564),
  item("09.10.2026", 365, 564)
];
const secondRow = [
  item("0,123456", 74, 680),
  item("Second fund", 141, 680),
  item("0,33", 365, 680),
  item("0,04", 498, 680),
  item("unidades", 74, 672),
  item("ISIN: IE00B4ND3602", 141, 672),
  item("09.10.2026", 365, 672),
  item("NÚMERO DE POSICIONES: 2", 141, 640)
];
export const syntheticPages = [
  [...introduction, ...header(600), ...firstRow],
  [...header(700), ...secondRow]
];
describe("Trade Republic text extraction", () => {
  it("uses coordinates across pages, joins names and handles merged quantity/name items", () => {
    const result = extractTradeRepublicText(
      syntheticPages.map((page) => [...page].reverse())
    );
    expect(result.reportDate).toBe("2026-10-10");
    expect(result.cash).toBe("0.6");
    expect(result.positions).toHaveLength(2);
    expect(result.positions[0]).toEqual({
      name: "Synthetic fund continued name",
      isin: "IE00B4L5Y983",
      quantity: "10.199032",
      price: "131.26",
      priceDate: "2026-10-09",
      value: "999.99"
    });
  });
  it("does not accept an incomplete table", () => {
    expect(() => extractTradeRepublicText([syntheticPages[0]])).toThrow();
  });
  it("rejects other currencies and image-only documents", () => {
    expect(() => extractTradeRepublicText([[]])).toThrow();
    expect(() =>
      extractTradeRepublicText(
        syntheticPages.map((page) =>
          page.map((i) => ({ ...i, text: i.text.replaceAll("EUR", "USD") }))
        )
      )
    ).toThrow();
  });
  it("parses separators strictly", () => {
    expect(parseSpanishDecimal("1.234,123456 EUR")).toBe("1234.123456");
    expect(() => parseSpanishDecimal("12.34,56")).toThrow();
  });
});
