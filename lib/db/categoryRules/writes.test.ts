import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CategoryRuleInput } from "@/definitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { changeCategoryRuleStatus, saveCategoryRule } from "./writes";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn()
}));

const query = {
  insert: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  not: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn()
};
const input: CategoryRuleInput = {
  name: "  Suscripción familiar  ",
  category_id: "category",
  field: "merchant_name",
  operator: "equals",
  value: "  NETFLIX  ",
  currency: "EUR",
  direction: "expense",
  account_id: null,
  status: "active"
};

beforeEach(() => {
  for (const method of ["insert", "update", "eq", "not", "select"] as const)
    query[method].mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({ data: { id: "rule" }, error: null });
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    from: vi.fn(() => query)
  } as never);
});

describe("category rule writes", () => {
  it("persists a display name separately from its normalized condition", async () => {
    await saveCategoryRule("owner", input);
    expect(query.insert).toHaveBeenCalledWith({
      ...input,
      user_id: "owner",
      name: "Suscripción familiar",
      value: "netflix"
    });
  });

  it("protects owned edits against stale versions", async () => {
    await saveCategoryRule("owner", { ...input, id: "rule", version: 4 });
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(query.eq).toHaveBeenCalledWith("id", "rule");
    expect(query.eq).toHaveBeenCalledWith("version", 4);
    expect(query.not).toHaveBeenCalledWith(
      "status",
      "in",
      "(deleted,dismissed)"
    );
  });

  it.each([
    ["active", "paused"],
    ["paused", "active"]
  ] as const)("toggles to %s only from %s", async (status, previous) => {
    await changeCategoryRuleStatus("owner", "rule", 4, status);
    expect(query.update).toHaveBeenCalledWith({ status });
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(query.eq).toHaveBeenCalledWith("version", 4);
    expect(query.eq).toHaveBeenCalledWith("status", previous);
  });

  it("rejects status changes when the owned version or expected state no longer matches", async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(
      changeCategoryRuleStatus("owner", "rule", 4, "active")
    ).rejects.toThrow("version changed");
  });
});
