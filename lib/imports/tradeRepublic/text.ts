import type { PortfolioExtraction, PortfolioPosition } from "@/definitions";
import { validatePortfolioValues } from "@/lib/domain/portfolio/values";

export type PdfTextItem = { text: string; x: number; y: number };
type Line = { y: number; items: PdfTextItem[]; text: string };

export class TradeRepublicPdfError extends Error {
  constructor(
    public readonly reason: "unsupported" | "protected" | "limit" | "invalid"
  ) {
    super("Trade Republic PDF could not be extracted.");
  }
}

function lines(items: PdfTextItem[]): Line[] {
  const result: Line[] = [];
  for (const item of [...items]
    .filter((item) => item.text.trim())
    .sort((a, b) => b.y - a.y || a.x - b.x)) {
    const previous = result.at(-1);
    if (previous && Math.abs(previous.y - item.y) < 2)
      previous.items.push(item);
    else result.push({ y: item.y, items: [item], text: "" });
  }
  return result.map((line) => ({
    ...line,
    items: line.items.sort((a, b) => a.x - b.x),
    text: line.items.map((item) => item.text.trim()).join(" ")
  }));
}

export function parseSpanishDecimal(text: string): string {
  const cleaned = text.trim().replace(/\s*EUR\s*$/, "");
  if (!/^[+-]?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,6})?$/.test(cleaned))
    throw new TradeRepublicPdfError("unsupported");
  return cleaned.replaceAll(".", "").replace(",", ".");
}

function parseDate(text: string): string {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text.trim());
  if (!match) throw new TradeRepublicPdfError("unsupported");
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function summaryAmount(page: Line[], label: string, start: number): string {
  const line = page
    .slice(start, start + 8)
    .find((line) => line.items[0]?.text.trim().toUpperCase() === label);
  if (!line || line.items.length < 2)
    throw new TradeRepublicPdfError("unsupported");
  return parseSpanishDecimal(line.items.at(-1)!.text);
}

export function extractTradeRepublicText(
  pages: PdfTextItem[][]
): PortfolioExtraction {
  const grouped = pages.map(lines);
  const first = grouped[0];
  if (!first || !first.some((line) => line.text.includes("TRADE REPUBLIC")))
    throw new TradeRepublicPdfError("unsupported");
  const titleIndex = first.findIndex(
    (line) => line.text === "EXTRACTO DEL PATRIMONIO NETO"
  );
  const dateLine = first[titleIndex + 1]?.text;
  const summaryIndex = first.findIndex(
    (line) =>
      line.items[0]?.text === "CARTERA" && line.text.includes("VALOR EN EUR")
  );
  if (
    titleIndex < 0 ||
    summaryIndex < 0 ||
    !dateLine?.match(/^a \d{2}\.\d{2}\.\d{4}$/)
  )
    throw new TradeRepublicPdfError("unsupported");
  const reportDate = parseDate(dateLine.slice(2));
  const reportedInvestments = summaryAmount(
    first,
    "CUENTA DE VALORES",
    summaryIndex
  );
  const cash = summaryAmount(first, "EFECTIVO", summaryIndex);
  const reportedTotal = summaryAmount(first, "TOTAL", summaryIndex);
  const positions: PortfolioPosition[] = [];
  let columns: {
    quantity: number;
    name: number;
    price: number;
    value: number;
  } | null = null;
  let expectedCount: number | null = null;
  for (const page of grouped) {
    for (let index = 0; index < page.length; index++) {
      const line = page[index];
      if (line.text.includes("UNIDADES / NOMINAL")) {
        const find = (label: string) =>
          line.items.find((item) => item.text.trim() === label)?.x;
        const quantity = find("UNIDADES / NOMINAL"),
          name = find("NOMBRE DEL VALOR"),
          price = find("PRECIO POR UNIDAD"),
          value = find("VALOR EN EUR");
        if (
          quantity === undefined ||
          name === undefined ||
          price === undefined ||
          value === undefined
        )
          throw new TradeRepublicPdfError("unsupported");
        columns = { quantity, name, price, value };
        continue;
      }
      const count = /NÚMERO DE POSICIONES:\s*(\d+)/.exec(line.text);
      if (count) {
        expectedCount = Number(count[1]);
        columns = null;
        continue;
      }
      if (!columns || line.items[0].x > columns.name - 2) continue;
      const quantityMatch =
        /^([+-]?[\d.,]+)(?:\s+unidades\b)?(?:\s+(.*))?$/.exec(
          line.items[0].text.trim()
        );
      if (!quantityMatch) continue;
      const cells = line.items.filter(
        (item) => item.x >= columns!.name - 2 && item.x < columns!.price - 2
      );
      const price = line.items.find(
        (item) => item.x >= columns!.price - 2 && item.x < columns!.value - 2
      );
      const value = line.items.find((item) => item.x >= columns!.value - 2);
      if (!price || !value) throw new TradeRepublicPdfError("unsupported");
      const nameParts = [
        quantityMatch[2] ?? "",
        ...cells.map((item) => item.text)
      ];
      let isin: string | undefined;
      let priceDate: string | undefined;
      for (let next = index + 1; next < page.length; next++) {
        const detail = page[next];
        if (
          line.y - detail.y > 70 ||
          detail.text.includes("NÚMERO DE POSICIONES")
        )
          break;
        const left = detail.items[0];
        if (
          left.x < columns.name - 2 &&
          /^[\d.,]+(?:\s+unidades\b)?/.test(left.text)
        )
          break;
        for (const item of detail.items) {
          if (
            item.x >= columns.price - 2 &&
            item.x < columns.value - 2 &&
            /^\d{2}\.\d{2}\.\d{4}$/.test(item.text.trim())
          )
            priceDate = parseDate(item.text);
          if (item.x >= columns.name - 2 && item.x < columns.price - 2) {
            const match = /^ISIN:\s*([A-Z]{2}[A-Z0-9]{9}\d)$/.exec(
              item.text.trim()
            );
            if (match) isin = match[1];
            else if (!isin) nameParts.push(item.text);
          }
        }
        if (isin && priceDate) break;
      }
      if (!isin || !priceDate) throw new TradeRepublicPdfError("unsupported");
      positions.push({
        name: nameParts.filter(Boolean).join(" ").trim(),
        isin,
        quantity: parseSpanishDecimal(quantityMatch[1]),
        price: parseSpanishDecimal(price.text),
        priceDate,
        value: parseSpanishDecimal(value.text)
      });
    }
  }
  if (expectedCount === null || expectedCount !== positions.length)
    throw new TradeRepublicPdfError("unsupported");
  try {
    return {
      ...validatePortfolioValues({
        reportDate,
        currency: "EUR",
        cash,
        positions
      }),
      reportedInvestments,
      reportedTotal
    };
  } catch {
    throw new TradeRepublicPdfError("unsupported");
  }
}
