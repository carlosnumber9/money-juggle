import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  allowed: vi.fn(),
  date: vi.fn(),
  revalidate: vi.fn()
}));
vi.mock("@/lib/supabase/currentUser", () => ({
  getCurrentSupabaseUser: mocks.user
}));
vi.mock("@/lib/auth/allowlist", () => ({ isEmailAllowed: mocks.allowed }));
vi.mock("@/lib/db/enableBankingTransactions", () => ({
  updateTransactionReportingDate: mocks.date
}));
vi.mock("@/lib/db/transactionCategories", () => ({
  updateTransactionCategoryAssignment: vi.fn()
}));
vi.mock("@/lib/db/transactionLabels", () => ({
  assignTransactionLabel: vi.fn(),
  createAndAssignTransactionLabel: vi.fn(),
  removeTransactionLabelAssignment: vi.fn()
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { updateTransactionReportingDateAction } from "./actions";
const input = {
  transactionId: "12345678-1234-4123-8123-123456789abc",
  reportingDate: "2025-12-31"
};
beforeEach(() => {
  vi.resetAllMocks();
});
describe("reporting-date action", () => {
  it.each([
    [null, 401],
    [{ id: "other", email: "other@example.com" }, 403]
  ])(
    "signals rejected access without financial writes",
    async (user, status) => {
      mocks.user.mockResolvedValue(user);
      mocks.allowed.mockReturnValue(false);
      expect(await updateTransactionReportingDateAction(input)).toMatchObject({
        ok: false,
        status
      });
      expect(mocks.date).not.toHaveBeenCalled();
    }
  );
  it("uses session ownership and leaves revalidation to the month cache", async () => {
    mocks.user.mockResolvedValue({ id: "owner", email: "owner@example.com" });
    mocks.allowed.mockReturnValue(true);
    mocks.date.mockResolvedValue(input.reportingDate);
    expect(await updateTransactionReportingDateAction(input)).toEqual({
      ok: true,
      value: { reportingDate: input.reportingDate }
    });
    expect(mocks.date).toHaveBeenCalledWith({ ...input, userId: "owner" });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("rejects invalid dates before session or database access", async () => {
    expect(
      await updateTransactionReportingDateAction({
        ...input,
        reportingDate: "2026-02-30"
      })
    ).toMatchObject({ ok: false });
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.date).not.toHaveBeenCalled();
  });
});
