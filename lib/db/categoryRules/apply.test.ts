import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/serviceRole", () => ({
  createSupabaseServiceRoleClient: vi.fn()
}));
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { applyCategoryRulesAfterSync } from "./apply";
const rule = {
  id: "rule",
  user_id: "owner",
  field: "merchant_name",
  operator: "equals",
  value: "netflix",
  currency: "EUR",
  direction: "expense",
  account_id: null,
  category_id: "category",
  status: "active",
  activated_at: "2026-10-01T00:00:00Z",
  version: 1
};
const movement = {
  id: "future",
  account_id: "account",
  booking_status: "booked",
  booking_date: "2026-11-01",
  first_seen_at: "2026-11-01T00:00:00Z",
  amount: "-10",
  currency: "EUR",
  merchant_name: "netflix",
  counterparty_name: null,
  description: null,
  category_id: null,
  category_source: null,
  category_rule_conflict: false
};
function query(result: unknown) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    is: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    gt: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve)
  };
  for (const name of [
    "select",
    "eq",
    "neq",
    "is",
    "or",
    "order",
    "gt",
    "limit"
  ] as const)
    q[name].mockReturnValue(q);
  q.maybeSingle.mockResolvedValue(result);
  return q;
}
const rpc = vi.fn();
beforeEach(() => rpc.mockResolvedValue({ data: 1, error: null }));
function setup(pages: unknown[][], owned = true, active = true) {
  const connection = query({
    data: owned ? { id: "connection" } : null,
    error: null
  });
  const rules = query({ data: active ? [rule] : [], error: null });
  const batches = pages.map((data) => query({ data, error: null }));
  let page = 0;
  const from = vi.fn((table: string) =>
    table === "bank_connections"
      ? connection
      : table === "category_rules"
        ? rules
        : batches[page++]
  );
  vi.mocked(createSupabaseServiceRoleClient).mockReturnValue({
    from,
    rpc
  } as never);
  return { connection, rules, batches };
}
describe("post-sync assignment", () => {
  it("validates owned connection before reading rules", async () => {
    const { connection } = setup([], false);
    await expect(
      applyCategoryRulesAfterSync("owner", "connection")
    ).rejects.toThrow("not owned");
    expect(connection.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("submits only future eligible movements to the atomic owned RPC", async () => {
    setup([
      [
        movement,
        { ...movement, id: "manual", category_source: "manual" },
        { ...movement, id: "historic", booking_date: "2026-09-01" }
      ]
    ]);
    await applyCategoryRulesAfterSync("owner", "connection");
    expect(rpc).toHaveBeenCalledWith("apply_category_rule_assignments", {
      p_user_id: "owner",
      p_connection_id: "connection",
      p_transaction_ids: ["future"]
    });
  });
  it("uses keyset pagination while assignments remove rows", async () => {
    const first = Array.from({ length: 500 }, (_, index) => ({
      ...movement,
      id: `row${String(index).padStart(4, "0")}`
    }));
    const { batches } = setup([first, [{ ...movement, id: "row0500" }]]);
    await applyCategoryRulesAfterSync("owner", "connection");
    expect(batches[1].gt).toHaveBeenCalledWith("id", "row0499");
    expect(rpc).toHaveBeenCalledTimes(2);
  });
  it("rechecks stale conflicts after all rules are paused", async () => {
    setup([[{ ...movement, category_rule_conflict: true }]], true, false);
    await applyCategoryRulesAfterSync("owner", "connection");
    expect(rpc).toHaveBeenCalledWith(
      "apply_category_rule_assignments",
      expect.objectContaining({ p_transaction_ids: ["future"] })
    );
  });
  it("fails safely on an RPC failure for deferred retry", async () => {
    setup([[movement]]);
    rpc.mockResolvedValueOnce({ error: { message: "private" } });
    await expect(
      applyCategoryRulesAfterSync("owner", "connection")
    ).rejects.toThrow("Could not apply category rules.");
  });
});
