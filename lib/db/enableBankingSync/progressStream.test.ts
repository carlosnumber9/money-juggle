import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createDashboardProgressStream } from "./progressStream";

describe("server progress stream", () => {
  it("delivers progress before work completes and keeps cleanup alive after disconnect", async () => {
    let release!: () => void;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    const cleanup = vi.fn();
    const { response, finished } = createDashboardProgressStream(
      async (report) => {
        try {
          report({ type: "phase", phase: "connections", status: "running" });
          await wait;
          report({ type: "phase", phase: "connections", status: "completed" });
          return {
            status: 200,
            body: {
              hasErrors: false,
              incomplete: false,
              retryPending: false,
              feedback: []
            }
          };
        } finally {
          cleanup();
        }
      }
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "private, no-store, no-transform"
    );
    const reader = response.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toContain(
      '"running"'
    );
    expect(cleanup).not.toHaveBeenCalled();
    await reader.cancel();
    release();
    await finished;
    expect(cleanup).toHaveBeenCalledOnce();
  });
  it("sanitizes unexpected server failures", async () => {
    const { response, finished } = createDashboardProgressStream(async () => {
      throw new Error("private-secret");
    });
    const body = await response.text();
    await finished;
    expect(body).toContain("dashboard-sync-failed");
    expect(body).not.toContain("private-secret");
  });
});
