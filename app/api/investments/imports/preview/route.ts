import { NextRequest, NextResponse } from "next/server";
import { bankingDataSource } from "@/lib/data/bankingDataSource";
import { createPortfolioDraft } from "@/lib/db/portfolio/imports";
import {
  extractTradeRepublicPdf,
  MAX_PDF_BYTES,
  TRADE_REPUBLIC_PARSER_VERSION
} from "@/lib/imports/tradeRepublic/pdf";
import { TradeRepublicPdfError } from "@/lib/imports/tradeRepublic/text";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

async function readPdf(request: NextRequest): Promise<Uint8Array> {
  const length = Number(request.headers.get("content-length"));
  if (length > MAX_PDF_BYTES) throw new TradeRepublicPdfError("limit");
  const reader = request.body?.getReader();
  if (!reader) throw new TradeRepublicPdfError("invalid");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PDF_BYTES) {
        await reader.cancel();
        throw new TradeRepublicPdfError("limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function POST(request: NextRequest) {
  const user = await bankingDataSource.getCurrentUser();
  if (!user || !user.isAllowed)
    return NextResponse.json(
      { reason: "Inicia sesión con una cuenta autorizada." },
      { status: user ? 403 : 401, headers }
    );
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return NextResponse.json(
      { reason: "Origen de solicitud no permitido." },
      { status: 403, headers }
    );
  if (request.headers.get("content-type") !== "application/pdf")
    return NextResponse.json(
      { reason: "Selecciona un archivo PDF." },
      { status: 415, headers }
    );
  try {
    const { original, sourceHash } = await extractTradeRepublicPdf(
      await readPdf(request)
    );
    const draft = await createPortfolioDraft(
      user.id,
      original,
      sourceHash,
      TRADE_REPUBLIC_PARSER_VERSION
    );
    return NextResponse.json(
      { reviewUrl: `/investments/import?draft=${draft.id}` },
      { headers }
    );
  } catch (error) {
    if (error instanceof TradeRepublicPdfError) {
      const reason =
        error.reason === "limit"
          ? "El PDF supera los límites: 4 MiB, 20 páginas o 500 posiciones, o tarda demasiado en procesarse."
          : error.reason === "protected"
            ? "El PDF está protegido con contraseña. Exporta una copia sin protección."
            : error.reason === "unsupported"
              ? "No se reconoce el formato. Usa el extracto de patrimonio neto en EUR de Trade Republic, con texto seleccionable."
              : "No se pudo leer el PDF. Comprueba que el archivo no esté dañado.";
      return NextResponse.json(
        { reason },
        { status: error.reason === "limit" ? 413 : 422, headers }
      );
    }
    return NextResponse.json(
      { reason: "No se pudo preparar la importación. Inténtalo de nuevo." },
      { status: 500, headers }
    );
  }
}
