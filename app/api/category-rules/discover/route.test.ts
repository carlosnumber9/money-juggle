import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data/bankingDataSource", () => ({
  bankingDataSource: { getCurrentUser: vi.fn() }
}));
vi.mock("@/lib/models/discoverCategoryRules", () => ({
  discoverCategoryRules: vi.fn()
}));
import { bankingDataSource } from "@/lib/data/bankingDataSource";
import { discoverCategoryRules } from "@/lib/models/discoverCategoryRules";
import { POST } from "./route";
const request = () =>
  new Request("https://example.invalid/api/category-rules/discover", {
    method: "POST",
    headers: { origin: "https://example.invalid" }
  });
beforeEach(() =>
  vi.mocked(bankingDataSource.getCurrentUser).mockResolvedValue({
    id: "owner",
    email: "owner@example.invalid",
    isAllowed: true
  })
);
describe("discovery endpoint", () => {
  it("rejects missing and disallowed sessions before inference", async () => {
    vi.mocked(bankingDataSource.getCurrentUser).mockResolvedValueOnce(null);
    expect((await POST(request())).status).toBe(401);
    vi.mocked(bankingDataSource.getCurrentUser).mockResolvedValueOnce({
      id: "other",
      email: null,
      isAllowed: false
    });
    expect((await POST(request())).status).toBe(403);
    expect(discoverCategoryRules).not.toHaveBeenCalled();
  });
  it("rejects cross-origin requests", async () => {
    expect(
      (
        await POST(
          new Request(request(), {
            headers: { origin: "https://other.invalid" }
          })
        )
      ).status
    ).toBe(403);
    expect(discoverCategoryRules).not.toHaveBeenCalled();
  });
  it("returns private coverage derived from authenticated owner", async () => {
    vi.mocked(discoverCategoryRules).mockResolvedValueOnce({
      from: "2025-10-11",
      to: "2026-10-12",
      rows: 100,
      texts: 20,
      truncated: true,
      proposals: 3
    });
    const result = await POST(request());
    expect(result.headers.get("cache-control")).toContain("no-store");
    expect(await result.json()).toMatchObject({
      ok: true,
      value: { truncated: true }
    });
    expect(discoverCategoryRules).toHaveBeenCalledWith(
      "owner",
      expect.any(Date)
    );
  });
  it("isolates model failure and permits subsequent retry", async () => {
    vi.mocked(discoverCategoryRules).mockRejectedValueOnce(
      new Error("private financial text")
    );
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain(
      "private financial"
    );
    expect((await POST(request())).status).toBe(200);
  });
  it("prevents overlapping inference within one server instance", async () => {
    let release!: () => void;
    vi.mocked(discoverCategoryRules).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve({
              from: "",
              to: "",
              rows: 0,
              texts: 0,
              truncated: false,
              proposals: 0
            });
        })
    );
    const first = POST(request());
    await vi.waitFor(() => expect(discoverCategoryRules).toHaveBeenCalled());
    expect((await POST(request())).status).toBe(409);
    release();
    await first;
  });
});
