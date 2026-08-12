import type { BankConnectionSummary } from "@/definitions";
import { describe, expect, it } from "vitest";

import { getLinkingStaleAt, isStaleLinkingConnection } from "./linkingState";

describe("linking state", () => {
  const connection = {
    created_at: "2026-08-12T10:00:00.000Z",
    updated_at: "2026-08-12T10:14:00.000Z"
  } as BankConnectionSummary;

  it("calculates the retry deadline from the authorization start", () => {
    expect(getLinkingStaleAt(connection)).toBe("2026-08-12T10:15:00.000Z");
  });

  it("does not postpone retry when an operational update touches the row", () => {
    const operationallyUpdatedConnection = {
      ...connection,
      updated_at: "2026-08-12T12:00:00.000Z"
    } as BankConnectionSummary;

    expect(getLinkingStaleAt(operationallyUpdatedConnection)).toBe(
      "2026-08-12T10:15:00.000Z"
    );
  });

  it("becomes stale at the retry deadline", () => {
    expect(
      isStaleLinkingConnection(
        connection,
        Date.parse("2026-08-12T10:14:59.999Z")
      )
    ).toBe(false);
    expect(
      isStaleLinkingConnection(
        connection,
        Date.parse("2026-08-12T10:15:00.000Z")
      )
    ).toBe(true);
  });
});
