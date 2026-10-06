import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const source = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getProviderApplication: vi.fn(),
  listAvailableInstitutions: vi.fn(),
  listBankConnections: vi.fn(),
  listCompletedTransactionBackfillConnectionIds: vi.fn(),
  listMonthlyTransactions: vi.fn(),
  listTransactionCategoryGroups: vi.fn(),
  listTransactionLabels: vi.fn(),
  listTransactionReconciliationAdjustments: vi.fn()
}));
vi.mock("@/lib/data/bankingDataSource", () => ({ bankingDataSource: source }));
import { getPrivateHomeView } from "./getPrivateHomeView";

beforeEach(() => {
  vi.resetAllMocks();
  source.getCurrentUser.mockResolvedValue({
    id: "owner",
    email: "owner@example.com",
    isAllowed: true
  });
  source.getProviderApplication.mockResolvedValue({ name: "App" });
  for (const [name, method] of Object.entries(source)) {
    if (name.startsWith("list")) method.mockResolvedValue([]);
  }
});

describe("active home tab", () => {
  it("reads only the requested month and review catalogs for transactions", async () => {
    const view = await getPrivateHomeView("2026-07", "transactions");
    expect(view).toMatchObject({ kind: "ready", tab: "transactions" });
    expect(source.listMonthlyTransactions).toHaveBeenCalledExactlyOnceWith(
      "owner",
      { from: "2026-07-01", to: "2026-08-01" }
    );
    expect(
      source.listTransactionReconciliationAdjustments
    ).not.toHaveBeenCalled();
    expect(source.listBankConnections).not.toHaveBeenCalled();
    expect(source.listAvailableInstitutions).not.toHaveBeenCalled();
  });
  it("loads annual data only in evolution", async () => {
    await getPrivateHomeView("2026-07", "evolution");
    expect(source.listMonthlyTransactions).toHaveBeenCalledTimes(2);
    expect(
      source.listTransactionReconciliationAdjustments
    ).toHaveBeenCalledTimes(2);
    expect(source.listBankConnections).not.toHaveBeenCalled();
    expect(source.listTransactionCategoryGroups).not.toHaveBeenCalled();
  });
  it("loads bank cards and monthly cashflow in dashboard", async () => {
    await getPrivateHomeView("2026-07", "dashboard");
    expect(source.listMonthlyTransactions).toHaveBeenCalledTimes(1);
    expect(source.listBankConnections).toHaveBeenCalledOnce();
    expect(source.listAvailableInstitutions).toHaveBeenCalledOnce();
    expect(source.listTransactionLabels).not.toHaveBeenCalled();
  });
  it("does not read financial data before authorization", async () => {
    source.getCurrentUser.mockResolvedValue(null);
    expect(await getPrivateHomeView("2026-07", "transactions")).toEqual({
      kind: "unauthenticated"
    });
    source.getCurrentUser.mockResolvedValue({ isAllowed: false });
    expect(await getPrivateHomeView("2026-07", "transactions")).toEqual({
      kind: "forbidden"
    });
    expect(source.listMonthlyTransactions).not.toHaveBeenCalled();
    expect(source.getProviderApplication).not.toHaveBeenCalled();
  });
});
