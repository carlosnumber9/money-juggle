import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data/bankingDataSource", () => ({
  bankingDataSource: { getCurrentUser: vi.fn() }
}));
vi.mock("@/lib/db/categoryRules/writes", () => ({
  saveCategoryRule: vi.fn(),
  changeCategoryRuleStatus: vi.fn()
}));
import { bankingDataSource } from "@/lib/data/bankingDataSource";
import {
  saveCategoryRule,
  changeCategoryRuleStatus
} from "@/lib/db/categoryRules/writes";
import {
  saveCategoryRuleAction,
  changeCategoryRuleStatusAction
} from "./actions";
const input = {
  field: "merchant_name",
  operator: "equals",
  value: "netflix",
  currency: "EUR",
  direction: "expense",
  account_id: null,
  category_id: "f8000000-0000-4000-8000-000000000011",
  status: "active"
};
beforeEach(() =>
  vi.mocked(bankingDataSource.getCurrentUser).mockResolvedValue({
    id: "owner",
    email: "owner@example.invalid",
    isAllowed: true
  })
);
describe("rule actions", () => {
  it("derives ownership from validated session", async () => {
    expect((await saveCategoryRuleAction(input)).ok).toBe(true);
    expect(saveCategoryRule).toHaveBeenCalledWith("owner", input);
  });
  it("rejects missing sessions and disallowed users", async () => {
    vi.mocked(bankingDataSource.getCurrentUser).mockResolvedValueOnce(null);
    expect(await saveCategoryRuleAction(input)).toMatchObject({
      ok: false,
      status: 401
    });
    vi.mocked(bankingDataSource.getCurrentUser).mockResolvedValueOnce({
      id: "other",
      email: null,
      isAllowed: false
    });
    expect(await saveCategoryRuleAction(input)).toMatchObject({
      ok: false,
      status: 403
    });
    expect(saveCategoryRule).not.toHaveBeenCalled();
  });
  it("rejects arbitrary statuses and malformed input", async () => {
    expect((await saveCategoryRuleAction({})).ok).toBe(false);
    expect(
      (
        await changeCategoryRuleStatusAction({
          id: "bad",
          version: 1,
          status: "deleted"
        })
      ).ok
    ).toBe(false);
    expect(changeCategoryRuleStatus).not.toHaveBeenCalled();
  });
  it("hides persistence failures", async () => {
    vi.mocked(saveCategoryRule).mockRejectedValueOnce(
      new Error("secret database detail")
    );
    const result = await saveCategoryRuleAction(input);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
