import { afterEach, describe, expect, it, vi } from "vitest";
import { requestMonthlyWorkbook } from "./download";

afterEach(() => vi.unstubAllGlobals());

describe("monthly export download request", () => {
  it("passes cancellation and only the month, without triggering synchronization", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("xlsx", {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const blob = await requestMonthlyWorkbook("2026-09", controller.signal);
    expect(blob.size).toBe(4);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reports/monthly",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        body: '{"month":"2026-09"}'
      })
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([
    [401, "application/json", "Tu sesión"],
    [400, "application/json", "mes válido"],
    [500, "application/json", "No se pudo"],
    [200, "text/html", "No se pudo"]
  ])(
    "rejects invalid responses (%s, %s)",
    async (status, contentType, message) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response("error", {
            status,
            headers: { "Content-Type": contentType }
          })
        )
      );
      await expect(
        requestMonthlyWorkbook("2026-09", new AbortController().signal)
      ).rejects.toThrow(message);
    }
  );
});
