import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { rpc, client } = vi.hoisted(() => ({ rpc: vi.fn(), client: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: client
}));
import { confirmPortfolioImport, PortfolioImportError } from "./imports";
const input = {
  draftId: "draft",
  values: {
    reportDate: "2026-10-10",
    currency: "EUR" as const,
    cash: "0.6",
    positions: []
  },
  expectedRevision: null,
  replace: false
};
beforeEach(() => {
  client.mockResolvedValue({ rpc });
});
describe("portfolio confirmation", () => {
  it("passes revision and replacement acknowledgement to an atomic authenticated RPC", async () => {
    rpc.mockResolvedValue({ data: "snapshot", error: null });
    expect(await confirmPortfolioImport(input)).toBe("snapshot");
    expect(rpc).toHaveBeenCalledWith("confirm_portfolio_import", {
      p_draft_id: "draft",
      p_values: input.values,
      p_expected_revision: null,
      p_replace: false
    });
  });
  it.each([
    ["40001", "conflict"],
    ["P0002", "expired"],
    ["42501", "unavailable"]
  ])("sanitizes failure %s", async (code, reason) => {
    rpc.mockResolvedValue({ error: { code, message: "private data" } });
    await expect(confirmPortfolioImport(input)).rejects.toEqual(
      new PortfolioImportError(reason as "conflict" | "expired" | "unavailable")
    );
  });
  it("rejects invalid financial data before persistence", async () => {
    await expect(
      confirmPortfolioImport({
        ...input,
        values: { ...input.values, cash: "NaN" }
      })
    ).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});
