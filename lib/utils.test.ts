import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("combines conditional classes", () => {
    expect(cn("card", false && "hidden", { selected: true })).toBe(
      "card selected"
    );
  });

  it("resolves conflicting Tailwind classes", () => {
    expect(cn("px-2", "px-4", "text-sm", "text-lg")).toBe("px-4 text-lg");
  });
});
