import { afterEach, describe, expect, it, vi } from "vitest";
import { requestSync } from "./requests";

describe("synchronization response handling", () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each([200, 429, 500])(
    "preserves structured feedback from HTTP %s",
    async (status) => {
      const feedback = [
        {
          bankName: "CaixaBank",
          resource: "transactions",
          kind: "error",
          retryAt: null
        }
      ];
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              hasErrors: true,
              incomplete: false,
              retryPending: false,
              feedback
            }),
            { status }
          )
        )
      );
      await expect(requestSync("/api/sync/dashboard")).resolves.toMatchObject({
        hasErrors: true,
        feedback
      });
    }
  );
  it("does not treat legacy partial success as an actual error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ partialFailure: true }), {
          status: 200
        })
      )
    );
    await expect(requestSync("/api/sync/dashboard")).resolves.toMatchObject({
      hasErrors: false,
      incomplete: true
    });
  });
  it("propagates authentication failures instead of displaying success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "login-required" }), {
          status: 401
        })
      )
    );
    await expect(requestSync("/api/sync/dashboard")).rejects.toThrow(
      "Could not synchronize"
    );
  });
  it("propagates an unstructured server failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "dashboard-sync-failed" }), {
          status: 500
        })
      )
    );
    await expect(requestSync("/api/sync/dashboard")).rejects.toThrow(
      "Could not synchronize"
    );
  });
});
