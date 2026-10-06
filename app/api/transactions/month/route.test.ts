import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ user: vi.fn(), month: vi.fn() }));
vi.mock("@/lib/data/bankingDataSource", () => ({
  bankingDataSource: { getCurrentUser: mocks.user }
}));
vi.mock("@/lib/views/transactionMonthView", () => ({
  getTransactionMonthView: mocks.month
}));
import { GET } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
});
describe("private month endpoint", () => {
  it.each([
    [null, 401],
    [{ id: "owner", isAllowed: false }, 403]
  ])("rejects unauthorized callers", async (user, status) => {
    mocks.user.mockResolvedValue(user);
    const response = await GET(
      new NextRequest(
        "https://app.example/api/transactions/month?month=2026-07&userId=other"
      )
    );
    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.month).not.toHaveBeenCalled();
  });
  it("derives ownership from the session and never accepts a caller user id", async () => {
    mocks.user.mockResolvedValue({ id: "owner", isAllowed: true });
    mocks.month.mockResolvedValue({ rows: [], error: null });
    const response = await GET(
      new NextRequest(
        "https://app.example/api/transactions/month?month=2026-07&userId=other"
      )
    );
    expect(mocks.month).toHaveBeenCalledExactlyOnceWith("owner", "2026-07");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("does not return partial data as a successful month", async () => {
    mocks.user.mockResolvedValue({ id: "owner", isAllowed: true });
    mocks.month.mockResolvedValue({
      rows: [{ id: "partial" }],
      error: "No se pudieron cargar las categorías."
    });
    const response = await GET(
      new NextRequest("https://app.example/api/transactions/month")
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      reason: "No se pudieron cargar las categorías."
    });
  });
});
