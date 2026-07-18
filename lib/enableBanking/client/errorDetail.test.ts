import { describe, expect, it } from "vitest";

import { stringifyErrorDetail } from "./errorDetail";

describe("stringifyErrorDetail", () => {
  it.each([null, undefined])("returns undefined for %s", (value) => {
    expect(stringifyErrorDetail(value)).toBeUndefined();
  });

  it("serializes objects", () => {
    expect(stringifyErrorDetail({ error: "ASPSP_TIMEOUT" })).toBe(
      '{"error":"ASPSP_TIMEOUT"}'
    );
  });

  it("limits provider details to 500 characters", () => {
    expect(stringifyErrorDetail("x".repeat(600))).toHaveLength(500);
  });

  it("falls back safely for cyclic values", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expect(stringifyErrorDetail(cyclic)).toBe("[object Object]");
  });
});
