import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  create: vi.fn(),
  rename: vi.fn(),
  remove: vi.fn(),
  revalidate: vi.fn()
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/data/bankingDataSource", () => ({
  bankingDataSource: { getCurrentUser: mocks.user }
}));
vi.mock("@/lib/db/transactionLabels/management", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/lib/db/transactionLabels/management")
  >()),
  createTransactionLabel: mocks.create,
  renameTransactionLabel: mocks.rename,
  deleteTransactionLabel: mocks.remove
}));
import { TransactionLabelManagementError } from "@/lib/db/transactionLabels/management";
import {
  createTransactionLabelAction,
  renameTransactionLabelAction,
  deleteTransactionLabelAction
} from "./labelActions";

const labelId = "fa000000-0000-4000-8000-000000000060";
const label = { id: labelId, name: "Trip" };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "owner", isAllowed: true });
  mocks.create.mockResolvedValue(label);
  mocks.rename.mockResolvedValue(label);
  mocks.remove.mockResolvedValue(undefined);
});

describe("label management actions", () => {
  it("derives ownership from session for every operation and revalidates successful writes", async () => {
    expect(
      await createTransactionLabelAction({ name: "Trip", userId: "attacker" })
    ).toEqual({ ok: true, value: label });
    expect(
      await renameTransactionLabelAction({
        labelId,
        name: "Trip",
        userId: "attacker"
      })
    ).toEqual({ ok: true, value: label });
    expect(
      await deleteTransactionLabelAction({ labelId, userId: "attacker" })
    ).toEqual({ ok: true, value: null });
    expect(mocks.create).toHaveBeenCalledWith({
      userId: "owner",
      name: "Trip"
    });
    expect(mocks.rename).toHaveBeenCalledWith({
      userId: "owner",
      labelId,
      name: "Trip"
    });
    expect(mocks.remove).toHaveBeenCalledWith({ userId: "owner", labelId });
    expect(mocks.revalidate.mock.calls).toEqual([["/"], ["/"], ["/"]]);
  });
  it.each([null, { id: "other", isAllowed: false }])(
    "blocks all mutations for rejected access %j",
    async (user) => {
      mocks.user.mockResolvedValue(user);
      for (const response of [
        await createTransactionLabelAction({ name: "Trip" }),
        await renameTransactionLabelAction({ labelId, name: "Trip" }),
        await deleteTransactionLabelAction({ labelId })
      ])
        expect(response).toMatchObject({ ok: false, status: user ? 403 : 401 });
      expect(mocks.create).not.toHaveBeenCalled();
      expect(mocks.rename).not.toHaveBeenCalled();
      expect(mocks.remove).not.toHaveBeenCalled();
      expect(mocks.revalidate).not.toHaveBeenCalled();
    }
  );
  it.each([
    null,
    undefined,
    [],
    {},
    { name: 42 },
    { name: " " },
    { name: "x".repeat(81) }
  ])("rejects malformed creation %j", async (input) => {
    expect(await createTransactionLabelAction(input)).toMatchObject({
      ok: false
    });
    expect(mocks.user).not.toHaveBeenCalled();
  });
  it("rejects malformed rename and deletion", async () => {
    for (const input of [
      null,
      {},
      { labelId: "bad" },
      { labelId: 1 },
      { labelId, name: " " }
    ]) {
      expect(await renameTransactionLabelAction(input)).toMatchObject({
        ok: false
      });
    }
    for (const input of [null, {}, { labelId: "bad" }, { labelId: 1 }]) {
      expect(await deleteTransactionLabelAction(input)).toMatchObject({
        ok: false
      });
    }
    expect(mocks.user).not.toHaveBeenCalled();
  });
  it("reports duplicates without merging or revalidating", async () => {
    mocks.create.mockRejectedValue(
      new TransactionLabelManagementError("duplicate")
    );
    mocks.rename.mockRejectedValue(
      new TransactionLabelManagementError("duplicate")
    );
    expect(await createTransactionLabelAction({ name: "Trip" })).toEqual({
      ok: false,
      reason: "Ya existe una etiqueta con ese nombre."
    });
    expect(
      await renameTransactionLabelAction({ labelId, name: "Trip" })
    ).toMatchObject({
      ok: false,
      reason: "Ya existe una etiqueta con ese nombre."
    });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("hides persistence failures", async () => {
    mocks.remove.mockRejectedValue(new Error("secret database payload"));
    const result = await deleteTransactionLabelAction({ labelId });
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
