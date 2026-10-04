import { describe, expect, it } from "vitest";
import { buildSyncFeedback } from "./syncFeedback";

describe("public bank synchronization feedback", () => {
  it("groups duplicate account notices and excludes internal connection identifiers", () => {
    const feedback = buildSyncFeedback(
      [
        {
          bankConnectionId: "private-connection",
          resource: "transactions",
          kind: "deferred",
          retryAt: "2026-10-04T18:50:00Z"
        },
        {
          bankConnectionId: "private-connection",
          resource: "transactions",
          kind: "deferred",
          retryAt: "2026-10-04T18:55:00Z"
        }
      ],
      [{ id: "private-connection", institution: { name: "CaixaBank" } }]
    );
    expect(feedback).toEqual([
      {
        bankName: "CaixaBank",
        resource: "transactions",
        kind: "deferred",
        retryAt: "2026-10-04T18:55:00.000Z"
      }
    ]);
    expect(JSON.stringify(feedback)).not.toContain("private-connection");
  });
  it("discards malformed retry deadlines", () => {
    expect(
      buildSyncFeedback(
        [
          {
            bankConnectionId: "connection",
            resource: "transactions",
            kind: "deferred",
            retryAt: "not-a-date"
          }
        ],
        [{ id: "connection", institution_name: "ING" }]
      )
    ).toMatchObject([{ bankName: "ING", retryAt: null }]);
  });
});
