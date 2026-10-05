import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  data: vi.fn(),
  write: vi.fn()
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/data/bankingDataSource", () => ({
  bankingDataSource: {
    getCurrentUser: mocks.user,
    getMonthlyReportData: mocks.data
  }
}));
vi.mock("@/lib/reports/monthlyExport/writeWorkbook", () => ({
  writeMonthlyWorkbook: mocks.write
}));

import { reportData } from "@/lib/reports/monthlyExport/fixtures.testSupport";
import { POST } from "./route";

function request(body: unknown = { month: "2000-09" }) {
  return new Request("https://money-juggle.example.test/api/reports/monthly", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("private monthly export endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.mockResolvedValue({
      id: "owner-id",
      email: "owner@example.test",
      isAllowed: true
    });
    mocks.data.mockResolvedValue(reportData());
    mocks.write.mockResolvedValue(Buffer.from("xlsx-fixture"));
  });
  it("requires authentication before reading any financial data", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.data).not.toHaveBeenCalled();
  });
  it("rejects authenticated users outside the allowlist", async () => {
    mocks.user.mockResolvedValue({ id: "other-id", isAllowed: false });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.data).not.toHaveBeenCalled();
  });
  it.each([
    {},
    [],
    { month: "2099-01" },
    { month: "2026-13" },
    { month: "2026-09-01" }
  ])("rejects invalid periods: %j", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.data).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON", async () => {
    const malformed = new Request("https://example.test", {
      method: "POST",
      body: "{"
    });
    expect((await POST(malformed)).status).toBe(400);
  });
  it("reads only the session owner's data and sends a private XLSX download", async () => {
    const response = await POST(
      request({ month: "2000-09", userId: "attacker-selected-id" })
    );
    expect(response.status).toBe(200);
    expect(mocks.data).toHaveBeenCalledWith("owner-id", {
      from: "2000-09-01",
      to: "2000-10-01"
    });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Type")).toContain(
      "spreadsheetml.sheet"
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="Finanzas-2000-09.xlsx"'
    );
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe(
      "xlsx-fixture"
    );
  });
  it("fails on unavailable data instead of issuing an empty successful report", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.data.mockRejectedValue(new Error("database secret"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "monthly-export-failed" });
    expect(mocks.write).not.toHaveBeenCalled();
  });
});
