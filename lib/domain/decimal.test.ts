import { describe, expect, it } from "vitest";

import { formatDecimal, parseDecimal, sumDecimals } from "./decimal";

describe("decimal money helpers", () => {
  it("sums signed values without floating point drift", () => {
    expect(sumDecimals(["800", "-800.10"])).toBe("-0.1");
    expect(sumDecimals(["0.1", "0.2", "-0.3"])).toBe("0");
  });

  it("preserves the supported six decimal places", () => {
    expect(formatDecimal(parseDecimal("-12.345678"))).toBe("-12.345678");
  });

  it("rejects unsupported decimal values", () => {
    expect(() => parseDecimal("1,25")).toThrow("Invalid decimal value.");
    expect(() => parseDecimal("1.1234567")).toThrow("Invalid decimal value.");
  });
});
