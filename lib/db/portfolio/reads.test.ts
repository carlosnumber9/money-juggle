import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  from: vi.fn(),
  eq: vi.fn(),
  range: vi.fn(),
  single: vi.fn()
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.client
}));
import { getLatestPortfolioSnapshot, listPortfolioHistory } from "./reads";
const row = {
  id: "snapshot",
  report_date: "2026-10-10",
  currency: "EUR",
  cash: "123456789012.123456",
  investments: "0",
  revision: "revision"
};
beforeEach(() => {
  vi.resetAllMocks();
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: mocks.eq,
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: mocks.single,
    range: mocks.range
  };
  mocks.eq.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  mocks.client.mockResolvedValue({ from: mocks.from });
});
describe("portfolio reads", () => {
  it("paginates all observations using owner filters and exact strings", async () => {
    mocks.range
      .mockResolvedValueOnce({ data: Array.from({ length: 500 }, () => row) })
      .mockResolvedValueOnce({ data: [row] });
    const rows = await listPortfolioHistory("owner");
    expect(rows).toHaveLength(501);
    expect(rows[0].cash).toBe("123456789012.123456");
    expect(mocks.range.mock.calls).toEqual([
      [0, 499],
      [500, 999]
    ]);
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(mocks.from).toHaveBeenCalledWith("portfolio_snapshot_values");
  });
  it("does not fetch positions for an absent latest snapshot", async () => {
    mocks.single.mockResolvedValue({ data: null });
    expect(await getLatestPortfolioSnapshot("owner")).toBeNull();
    expect(mocks.from).toHaveBeenCalledOnce();
  });
  it("does not return partial history when a later page fails", async () => {
    mocks.range
      .mockResolvedValueOnce({ data: Array.from({ length: 500 }, () => row) })
      .mockResolvedValueOnce({ error: { message: "private" } });
    await expect(listPortfolioHistory("owner")).rejects.toThrow(
      "Portfolio import failed."
    );
  });
});
