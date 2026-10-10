import "server-only";
import type {
  DashboardProgressEvent,
  DashboardStreamEvent,
  SyncResponse
} from "@/definitions";

export function createDashboardProgressStream(
  run: (
    report: (event: DashboardProgressEvent) => void
  ) => Promise<{ status: number; body: SyncResponse }>
) {
  const encoder = new TextEncoder();
  let connected = true;
  let finish!: () => void;
  const finished = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: DashboardStreamEvent) => {
        if (!connected) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          connected = false;
        }
      };
      try {
        const result = await run(send);
        send({ type: "result", status: result.status, result: result.body });
      } catch {
        send({ type: "error", error: "dashboard-sync-failed" });
      } finally {
        if (connected) controller.close();
        finish();
      }
    },
    cancel() {
      // Stop delivery, not the authenticated operation: its finally releases leases.
      connected = false;
    }
  });
  return {
    finished,
    response: new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "private, no-store, no-transform",
        "X-Accel-Buffering": "no"
      }
    })
  };
}
