import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { extractTradeRepublicPdf, MAX_PDF_BYTES } from "./pdf";

describe("PDF boundary", () => {
  it("rejects non-PDF and oversized uploads", async () => {
    await expect(
      extractTradeRepublicPdf(new TextEncoder().encode("not a PDF"))
    ).rejects.toMatchObject({ reason: "invalid" });
    await expect(
      extractTradeRepublicPdf(new Uint8Array(MAX_PDF_BYTES + 1))
    ).rejects.toMatchObject({ reason: "limit" });
  });
  it("runs PDF.js in Node and rejects a valid image-only/unsupported PDF", async () => {
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> /Contents 4 0 R >>",
      "<< /Length 0 >>\nstream\n\nendstream"
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((body, i) => {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });
    const start = pdf.length;
    pdf += `xref\n0 5\n0000000000 65535 f \n${offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
      .join("")}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
    await expect(
      extractTradeRepublicPdf(new TextEncoder().encode(pdf))
    ).rejects.toMatchObject({ reason: "unsupported" });
  });
});
