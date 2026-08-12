import { describe, expect, it } from "vitest";

import { getInstitutionSlug } from "./institutionSlug";

describe("getInstitutionSlug", () => {
  it("recognizes Trade Republic names and provider identifiers", () => {
    expect(getInstitutionSlug("Trade Republic")).toBe("trade-republic");
    expect(getInstitutionSlug("ES:Trade Republic")).toBe("trade-republic");
  });
});
