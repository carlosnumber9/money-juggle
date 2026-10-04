import { describe, expect, it } from "vitest";
import { getTransactionRetryUntil, isTransactionRetryDeferred } from "./retry";

describe("transaction retry deadline", () => {
  it("delays an incomplete attempt for 15 minutes without changing freshness", () => {
    const deadline = getTransactionRetryUntil("2026-10-04T16:00:00Z");
    expect(deadline).toBe("2026-10-04T16:15:00.000Z");
    expect(
      isTransactionRetryDeferred(deadline, new Date("2026-10-04T16:14:59.999Z"))
    ).toBe(true);
    expect(isTransactionRetryDeferred(deadline, new Date(deadline))).toBe(
      false
    );
  });
  it("does not defer absent or malformed deadlines", () => {
    expect(isTransactionRetryDeferred(null)).toBe(false);
    expect(isTransactionRetryDeferred("invalid")).toBe(false);
  });
});
