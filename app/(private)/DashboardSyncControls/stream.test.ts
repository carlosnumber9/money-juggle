import { describe, expect, it, vi } from "vitest";
import { readDashboardStream } from "./stream";

const result = {
  hasErrors: false,
  incomplete: false,
  retryPending: false,
  feedback: []
};
function responseFromChunks(chunks: Uint8Array[]) {
  return new Response(
    new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(chunk));
        controller.close();
      }
    })
  );
}

describe("dashboard stream reader", () => {
  it("handles fragmented UTF-8, CRLF, multiple frames and structured failure results", async () => {
    const events = [
      { type: "banks", banks: [{ id: "bank", name: "Banco español" }] },
      {
        type: "bank",
        bankConnectionId: "bank",
        resource: "balances",
        status: "running"
      },
      {
        type: "result",
        status: 429,
        result: { ...result, hasErrors: true, retryPending: true }
      }
    ];
    const bytes = new TextEncoder().encode(
      events.map((event) => `data: ${JSON.stringify(event)}\r\n\r\n`).join("")
    );
    const progress = vi.fn();
    const response = responseFromChunks(
      Array.from(bytes, (byte) => new Uint8Array([byte]))
    );
    await expect(
      readDashboardStream(response, progress)
    ).resolves.toMatchObject({ hasErrors: true, retryPending: true });
    expect(progress.mock.calls.map(([event]) => event)).toEqual(
      events.slice(0, 2)
    );
  });
  it("rejects a premature end instead of returning success", async () => {
    const response = responseFromChunks([
      new TextEncoder().encode(
        'data: {"type":"phase","phase":"balances","status":"running"}\n\n'
      )
    ]);
    await expect(readDashboardStream(response, vi.fn())).rejects.toThrow(
      "without a result"
    );
  });
  it.each([
    { type: "error", error: "dashboard-sync-failed" },
    { type: "result", status: 200, result: {} },
    {
      type: "bank",
      bankConnectionId: "bank",
      resource: "payments",
      status: "completed"
    }
  ])("rejects server errors and invalid events", async (event) => {
    const response = responseFromChunks([
      new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
    ]);
    await expect(readDashboardStream(response, vi.fn())).rejects.toThrow();
  });
});
