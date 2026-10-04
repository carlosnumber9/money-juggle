import { describe, expect, it } from "vitest";
import type { SyncResponse } from "@/definitions";
import { getSyncNotices, resolveTransactionFeedback } from "./feedback";

const successful: SyncResponse = {
  hasErrors: false,
  incomplete: false,
  retryPending: false,
  feedback: []
};
describe("synchronization feedback", () => {
  it("shows incomplete received movements as a warning with the affected bank", () => {
    const notices = getSyncNotices(
      {
        ...successful,
        incomplete: true,
        feedback: [
          {
            bankName: "Trade Republic",
            resource: "transactions",
            kind: "partial",
            retryAt: null
          }
        ]
      },
      "refresh"
    );
    expect(notices).toEqual([
      { tone: "warning", message: expect.stringContaining("Trade Republic") }
    ]);
    expect(notices[0].message).toContain("Los datos recibidos se han guardado");
  });
  it("shows postponed downloads as information with a Madrid retry time", () => {
    const notices = getSyncNotices(
      {
        ...successful,
        retryPending: true,
        feedback: [
          {
            bankName: "CaixaBank",
            resource: "transactions",
            kind: "deferred",
            retryAt: "2026-10-04T18:55:00Z"
          }
        ]
      },
      "refresh"
    );
    expect(notices).toEqual([
      { tone: "info", message: expect.stringContaining("CaixaBank") }
    ]);
    expect(notices[0].message).toContain("20:55");
    expect(notices[0].message).not.toContain("se han guardado");
  });
  it("retains mixed errors and warnings instead of promoting all issues to errors", () => {
    const notices = getSyncNotices(
      {
        ...successful,
        hasErrors: true,
        incomplete: true,
        feedback: [
          {
            bankName: "CaixaBank",
            resource: "balances",
            kind: "error",
            retryAt: null
          },
          {
            bankName: "Trade Republic",
            resource: "transactions",
            kind: "partial",
            retryAt: null
          }
        ]
      },
      "refresh"
    );
    expect(notices.map((notice) => notice.tone)).toEqual(["error", "warning"]);
    expect(notices[0].message).toContain("todos los saldos");
    expect(notices[1].message).toContain("movimientos");
  });
  it("distinguishes history feedback and keeps real transport failures visible", () => {
    expect(
      getSyncNotices({ ...successful, hasErrors: true }, "backfill")[0]
    ).toMatchObject({
      tone: "error",
      message: expect.stringContaining("historial")
    });
    const notices = getSyncNotices(
      {
        ...successful,
        incomplete: true,
        feedback: [
          {
            bankName: "ING",
            resource: "transactions",
            kind: "partial",
            retryAt: null
          }
        ]
      },
      "backfill"
    );
    expect(notices[0].message).toContain("historial");
  });
  it("removes resolved movement feedback while retaining balance and other bank problems", () => {
    const previous: SyncResponse = {
      ...successful,
      hasErrors: true,
      incomplete: true,
      retryPending: true,
      feedback: [
        {
          bankName: "CaixaBank",
          resource: "transactions",
          kind: "error",
          retryAt: null
        },
        {
          bankName: "CaixaBank",
          resource: "balances",
          kind: "error",
          retryAt: null
        },
        {
          bankName: "Trade Republic",
          resource: "transactions",
          kind: "partial",
          retryAt: null
        },
        {
          bankName: "ING",
          resource: "transactions",
          kind: "deferred",
          retryAt: null
        }
      ]
    };
    const result = resolveTransactionFeedback(previous, ["CaixaBank"]);
    expect(result?.feedback).toHaveLength(3);
    expect(result).toMatchObject({
      hasErrors: true,
      incomplete: true,
      retryPending: true
    });
    const resolved = resolveTransactionFeedback(
      { ...successful, incomplete: true, feedback: [previous.feedback[2]] },
      ["Trade Republic"]
    );
    expect(getSyncNotices(resolved, "refresh")).toEqual([]);
  });
  it("does not turn an active concurrent sync into a failure", () => {
    expect(
      getSyncNotices({ ...successful, syncInProgress: true }, "refresh")
    ).toEqual([{ tone: "info", message: expect.stringContaining("en curso") }]);
  });
  it("removes notices after a fully successful refresh", () => {
    expect(getSyncNotices(successful, "refresh")).toEqual([]);
  });
});
