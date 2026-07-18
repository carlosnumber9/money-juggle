import { describe, expect, it } from "vitest";

import { getTextValue, normalizeText } from "./textValues";

describe("getTextValue", () => {
  it.each([null, undefined, "", "   "])("returns null for %s", (value) => {
    expect(getTextValue(value)).toBeNull();
  });

  it("trims strings and converts primitive values", () => {
    expect(getTextValue("  Salary  ")).toBe("Salary");
    expect(getTextValue(42.5)).toBe("42.5");
    expect(getTextValue(false)).toBe("false");
    expect(getTextValue(10n)).toBe("10");
  });

  it("joins meaningful array values", () => {
    expect(getTextValue([" Transfer ", null, 25, ""])).toBe("Transfer 25");
  });

  it("serializes structured values", () => {
    expect(getTextValue({ code: "CRDT" })).toBe('{"code":"CRDT"}');
  });

  it("falls back safely when a value cannot be serialized", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expect(getTextValue(cyclic)).toBe("[object Object]");
  });
});

describe("normalizeText", () => {
  it("collapses whitespace and lowercases text", () => {
    expect(normalizeText("  Monthly\n  SALARY  ")).toBe("monthly salary");
  });

  it("returns an empty string for absent values", () => {
    expect(normalizeText(null)).toBe("");
  });
});
