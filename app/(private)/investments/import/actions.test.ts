import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  save: vi.fn(),
  existing: vi.fn(),
  revalidate: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("redirect");
  })
}));
vi.mock("@/lib/data/bankingDataSource", () => ({
  bankingDataSource: { getCurrentUser: mocks.user }
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/db/portfolio/imports", async (original) => ({
  ...(await original<typeof import("@/lib/db/portfolio/imports")>()),
  confirmPortfolioImport: mocks.save,
  getPortfolioSnapshotForDate: mocks.existing
}));
import { PortfolioImportError } from "@/lib/db/portfolio/imports";
import { confirmPortfolioImportAction } from "./actions";
function form() {
  const result = new FormData();
  result.set("draftId", "f7000000-0000-4000-8000-000000000011");
  result.set("reviewedDate", "2026-10-10");
  result.set(
    "values",
    JSON.stringify({
      reportDate: "2026-10-10",
      currency: "EUR",
      cash: "0.6",
      positions: []
    })
  );
  return result;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "owner", isAllowed: true });
});
describe("review confirmation", () => {
  it("requires an allowed session", async () => {
    mocks.user.mockResolvedValue({ id: "other", isAllowed: false });
    expect(
      (await confirmPortfolioImportAction({ error: null }, form())).error
    ).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("requires another review after changing date", async () => {
    const changed = form();
    changed.set("reviewedDate", "2026-10-09");
    mocks.existing.mockResolvedValue(null);
    expect(
      await confirmPortfolioImportAction({ error: null }, changed)
    ).toMatchObject({ reviewedDate: "2026-10-10", existing: null });
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("refreshes a stale snapshot without overwriting", async () => {
    mocks.save.mockRejectedValue(new PortfolioImportError("conflict"));
    mocks.existing.mockResolvedValue({ revision: "new" });
    expect(
      await confirmPortfolioImportAction({ error: null }, form())
    ).toMatchObject({ existing: { revision: "new" } });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("rejects malformed financial values before persistence", async () => {
    const invalid = form();
    invalid.set("values", "{}");
    expect(
      (await confirmPortfolioImportAction({ error: null }, invalid)).error
    ).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("revalidates views and redirects only after a successful save", async () => {
    await expect(
      confirmPortfolioImportAction({ error: null }, form())
    ).rejects.toThrow("redirect");
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.revalidate).toHaveBeenCalledWith("/");
    expect(mocks.redirect).toHaveBeenCalledWith("/?tab=investments");
  });
});
