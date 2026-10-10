import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  extract: vi.fn(),
  draft: vi.fn()
}));
vi.mock("@/lib/data/bankingDataSource", () => ({
  bankingDataSource: { getCurrentUser: mocks.user }
}));
vi.mock("@/lib/db/portfolio/imports", () => ({
  createPortfolioDraft: mocks.draft
}));
vi.mock("@/lib/imports/tradeRepublic/pdf", () => ({
  extractTradeRepublicPdf: mocks.extract,
  MAX_PDF_BYTES: 4 * 1024 * 1024,
  TRADE_REPUBLIC_PARSER_VERSION: "1"
}));
import { TradeRepublicPdfError } from "@/lib/imports/tradeRepublic/text";
import { POST } from "./route";
const request = (
  body: BodyInit = "%PDF-test",
  headers: Record<string, string> = {}
) =>
  new NextRequest("https://app.example/api/investments/imports/preview", {
    method: "POST",
    body,
    headers: {
      origin: "https://app.example",
      "content-type": "application/pdf",
      ...headers
    }
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "owner", isAllowed: true });
});
describe("PDF preview boundary", () => {
  it.each([
    [null, 401],
    [{ id: "owner", isAllowed: false }, 403]
  ])("rejects unauthorized uploads before reading", async (user, status) => {
    mocks.user.mockResolvedValue(user);
    expect((await POST(request())).status).toBe(status);
    expect(mocks.extract).not.toHaveBeenCalled();
  });
  it("uses session owner and returns only a private review URL", async () => {
    mocks.extract.mockResolvedValue({
      original: { cash: "1" },
      sourceHash: "hash"
    });
    mocks.draft.mockResolvedValue({ id: "draft" });
    const response = await POST(request());
    expect(mocks.draft).toHaveBeenCalledWith(
      "owner",
      { cash: "1" },
      "hash",
      "1"
    );
    expect(await response.json()).toEqual({
      reviewUrl: "/investments/import?draft=draft"
    });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("rejects cross-origin requests and incorrect content types", async () => {
    expect(
      (await POST(request("pdf", { origin: "https://other.example" }))).status
    ).toBe(403);
    expect(
      (await POST(request("pdf", { "content-type": "text/plain" }))).status
    ).toBe(415);
    expect(mocks.extract).not.toHaveBeenCalled();
  });
  it("enforces streamed size even without content-length", async () => {
    expect(
      (await POST(request(new Uint8Array(4 * 1024 * 1024 + 1)))).status
    ).toBe(413);
    expect(mocks.extract).not.toHaveBeenCalled();
  });
  it.each(["unsupported", "protected", "invalid"] as const)(
    "sanitizes parser failure %s",
    async (reason) => {
      mocks.extract.mockRejectedValue(new TradeRepublicPdfError(reason));
      const response = await POST(request());
      expect(response.status).toBe(422);
      expect(mocks.draft).not.toHaveBeenCalled();
    }
  );
});
