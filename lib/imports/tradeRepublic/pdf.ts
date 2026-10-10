import "server-only";
import { createHash } from "node:crypto";
import {
  extractTradeRepublicText,
  TradeRepublicPdfError,
  type PdfTextItem
} from "./text";

export const MAX_PDF_BYTES = 4 * 1024 * 1024;
export const TRADE_REPUBLIC_PARSER_VERSION = "1";

export async function extractTradeRepublicPdf(bytes: Uint8Array) {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PDF_BYTES)
    throw new TradeRepublicPdfError("limit");
  if (Buffer.from(bytes.subarray(0, 1024)).indexOf("%PDF-") < 0)
    throw new TradeRepublicPdfError("invalid");
  const sourceHash = createHash("sha256").update(bytes).digest("hex");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    verbosity: 0
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const extraction = async () => {
      const pdf = await task.promise;
      if (pdf.numPages > 20) throw new TradeRepublicPdfError("limit");
      const pages: PdfTextItem[][] = [];
      let itemCount = 0;
      for (let number = 1; number <= pdf.numPages; number++) {
        const page = await pdf.getPage(number);
        const content = await page.getTextContent();
        itemCount += content.items.length;
        if (itemCount > 100_000) throw new TradeRepublicPdfError("limit");
        pages.push(
          content.items.flatMap((item) =>
            "str" in item
              ? [{ text: item.str, x: item.transform[4], y: item.transform[5] }]
              : []
          )
        );
        page.cleanup();
      }
      return { original: extractTradeRepublicText(pages), sourceHash };
    };
    return await Promise.race([
      extraction(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new TradeRepublicPdfError("limit")),
          15_000
        );
      })
    ]);
  } catch (error) {
    if (error instanceof TradeRepublicPdfError) throw error;
    throw new TradeRepublicPdfError(
      error instanceof Error && error.name === "PasswordException"
        ? "protected"
        : "invalid"
    );
  } finally {
    clearTimeout(timer);
    await task.destroy();
  }
}
