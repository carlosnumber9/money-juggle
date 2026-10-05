import { describe, expect, it } from "vitest";
import {
  getDefaultExportMonth,
  getExportPeriod,
  getMadridDate
} from "./period";

describe("export month validation", () => {
  const now = new Date("2026-10-05T12:00:00Z");
  it("rejects invalid and future months instead of silently falling back", () => {
    for (const value of [
      null,
      [],
      "2026-13",
      "2026-9",
      "1999-12",
      "2026-11",
      "2026-09-01"
    ])
      expect(getExportPeriod(value, now)).toBeNull();
    expect(getExportPeriod("2026-09", now)?.range).toEqual({
      from: "2026-09-01",
      to: "2026-10-01"
    });
    expect(getExportPeriod("2026-10", now)?.value).toBe("2026-10");
  });
  it("defaults to the previous month at year and Madrid midnight boundaries", () => {
    expect(getDefaultExportMonth(new Date("2026-01-05T00:00:00Z"))).toBe(
      "2025-12"
    );
    expect(getDefaultExportMonth(new Date("2026-09-30T22:30:00Z"))).toBe(
      "2026-09"
    );
    expect(getMadridDate("2026-09-30T22:30:00Z")).toBe("2026-10-01");
  });
});
