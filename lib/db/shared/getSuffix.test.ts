import { describe, expect, it } from "vitest";

import { getSuffix } from "./getSuffix";

describe("getSuffix", () => {
  it("returns the last eight characters", () => {
    expect(getSuffix("ES9121000418450200051332")).toBe("00051332");
  });

  it("keeps values shorter than eight characters", () => {
    expect(getSuffix("1234")).toBe("1234");
  });

  it.each([null, undefined, ""])("returns null for %s", (value) => {
    expect(getSuffix(value)).toBeNull();
  });
});
