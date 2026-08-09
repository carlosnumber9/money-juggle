import { describe, expect, it } from "vitest";

import { getReportingDateForSync } from "./reportingDate";

describe("getReportingDateForSync", () => {
  it("initializes a new movement from the bank booking date", () => {
    expect(getReportingDateForSync(undefined, "2026-08-09")).toBe("2026-08-09");
  });

  it("preserves an existing reporting date during later syncs", () => {
    expect(getReportingDateForSync("2026-07-31", "2026-08-02")).toBe(
      "2026-07-31"
    );
  });

  it("fills a missing reporting date when the bank later provides one", () => {
    expect(getReportingDateForSync(null, "2026-08-09")).toBe("2026-08-09");
  });

  it("keeps the date empty when neither source has one", () => {
    expect(getReportingDateForSync(undefined, null)).toBeNull();
  });
});
