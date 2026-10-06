import { afterEach, describe, expect, it, vi } from "vitest";
import { requestTransactionMonth } from "./monthRequest";
afterEach(() => vi.unstubAllGlobals());
describe("month request", () => {
  it("rejects a response for another month", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ data: { selectedMonth: { value: "2026-06" } } })
        )
    );
    await expect(
      requestTransactionMonth("2026-07", new AbortController().signal)
    ).rejects.toThrow("No se pudo cargar el mes seleccionado.");
  });
  it("passes cancellation to fetch and rejects expired authentication", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ reason: "Inicia sesión de nuevo." }, { status: 401 })
      );
    vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    await expect(
      requestTransactionMonth("2026-07", controller.signal)
    ).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledWith(
      "/api/transactions/month?month=2026-07",
      { signal: controller.signal, cache: "no-store" }
    );
  });
});
