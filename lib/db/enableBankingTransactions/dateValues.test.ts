import { describe, expect, it } from "vitest";

import { getDate, getDateTime, getLast4 } from "./dateValues";

describe("transaction date helpers", () => {
  it("extracts the date portion", () => {
    expect(getDate("2026-07-18T10:30:00Z")).toBe("2026-07-18");
    expect(getDate(null)).toBeNull();
  });

  it("accepts only date-time values for getDateTime", () => {
    expect(getDateTime("2026-07-18T10:30:00Z")).toBe("2026-07-18T10:30:00Z");
    expect(getDateTime("2026-07-18")).toBeNull();
  });

  it("extracts the last four alphanumeric characters", () => {
    expect(getLast4("ES91 2100-0418-4502-0005-1332")).toBe("1332");
    expect(getLast4("123")).toBeNull();
    expect(getLast4(undefined)).toBeNull();
  });
});
