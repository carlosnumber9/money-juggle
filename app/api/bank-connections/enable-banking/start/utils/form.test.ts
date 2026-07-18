import { describe, expect, it } from "vitest";

import { getRequiredFormValue } from "./form";

describe("getRequiredFormValue", () => {
  it("returns a trimmed string", () => {
    const formData = new FormData();
    formData.set("institution", "  ing  ");

    expect(getRequiredFormValue(formData, "institution")).toBe("ing");
  });

  it.each([null, "", "   "])("rejects missing values", (value) => {
    const formData = new FormData();
    if (value !== null) {
      formData.set("institution", value);
    }

    expect(() => getRequiredFormValue(formData, "institution")).toThrow(
      "Missing institution."
    );
  });

  it("rejects file values", () => {
    const formData = new FormData();
    formData.set("institution", new Blob(["ing"]));

    expect(() => getRequiredFormValue(formData, "institution")).toThrow(
      "Missing institution."
    );
  });
});
