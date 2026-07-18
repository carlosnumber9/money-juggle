import { describe, expect, it } from "vitest";

import { getErrorMessage } from "./getErrorMessage";

describe("getErrorMessage", () => {
  it("returns the message from Error instances", () => {
    expect(getErrorMessage(new Error("Provider unavailable"))).toBe(
      "Provider unavailable"
    );
  });

  it.each(["failure", null, undefined, { message: "hidden" }])(
    "does not expose unknown error values",
    (value) => {
      expect(getErrorMessage(value)).toBe("Unknown error.");
    }
  );
});
