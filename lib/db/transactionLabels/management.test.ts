import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.client
}));
import {
  createTransactionLabel,
  renameTransactionLabel,
  deleteTransactionLabel,
  TransactionLabelManagementError
} from "./management";

const label = { id: "label", name: "Viaje Lisboa" };
function query(data: unknown = label, error: { code: string } | null = null) {
  const chain = {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error })
  };
  for (const key of ["insert", "update", "delete", "eq", "select"] as const) {
    chain[key].mockReturnValue(chain);
  }
  const from = vi.fn().mockReturnValue(chain);
  mocks.client.mockResolvedValue({ from });
  return { ...chain, from };
}

beforeEach(() => vi.resetAllMocks());

describe("transaction label management", () => {
  it("creates a normalized owned label without assigning a transaction", async () => {
    const db = query();
    expect(
      await createTransactionLabel({
        userId: "owner",
        name: "  Viaje   Lisboa  "
      })
    ).toEqual(label);
    expect(db.insert).toHaveBeenCalledWith({
      user_id: "owner",
      name: "Viaje Lisboa"
    });
    expect(db.from).toHaveBeenCalledTimes(1);
    expect(db.from).toHaveBeenCalledWith("transaction_labels");
  });
  it("renames only an owned active label without touching assignments", async () => {
    const db = query();
    expect(
      await renameTransactionLabel({
        userId: "owner",
        labelId: "label",
        name: "  Viaje Lisboa "
      })
    ).toEqual(label);
    expect(db.update).toHaveBeenCalledWith({ name: "Viaje Lisboa" });
    expect(db.eq.mock.calls).toEqual([
      ["id", "label"],
      ["user_id", "owner"],
      ["is_archived", false]
    ]);
    expect(db.from).toHaveBeenCalledTimes(1);
  });
  it("deletes the owned label in one statement and relies on assignment cascades", async () => {
    const db = query({ id: "label" });
    await deleteTransactionLabel({ userId: "owner", labelId: "label" });
    expect(db.delete).toHaveBeenCalledOnce();
    expect(db.eq.mock.calls).toEqual([
      ["id", "label"],
      ["user_id", "owner"],
      ["is_archived", false]
    ]);
    expect(db.from).toHaveBeenCalledTimes(1);
  });
  it.each(["create", "rename"])(
    "reports duplicate %s without exposing database details",
    async (operation) => {
      query(null, { code: "23505" });
      const promise =
        operation === "create"
          ? createTransactionLabel({ userId: "owner", name: "Trip" })
          : renameTransactionLabel({
              userId: "owner",
              labelId: "label",
              name: "Trip"
            });
      await expect(promise).rejects.toMatchObject({ reason: "duplicate" });
    }
  );
  it.each(["rename", "delete"])(
    "rejects unavailable labels on %s",
    async (operation) => {
      query(null);
      const input = { userId: "owner", labelId: "not-owned", name: "Trip" };
      await expect(
        operation === "rename"
          ? renameTransactionLabel(input)
          : deleteTransactionLabel(input)
      ).rejects.toMatchObject({ reason: "unavailable" });
    }
  );
  it("rejects invalid names before accessing persistence", async () => {
    await expect(
      createTransactionLabel({ userId: "owner", name: " " })
    ).rejects.toBeInstanceOf(TransactionLabelManagementError);
    await expect(
      renameTransactionLabel({
        userId: "owner",
        labelId: "label",
        name: "x".repeat(81)
      })
    ).rejects.toMatchObject({ reason: "invalid" });
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("does not treat failed deletion as success", async () => {
    query(null, { code: "42501" });
    await expect(
      deleteTransactionLabel({ userId: "owner", labelId: "label" })
    ).rejects.toMatchObject({ reason: "unavailable" });
  });
});
