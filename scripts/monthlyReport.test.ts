import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { strFromU8, unzipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadEnv: vi.fn(),
  createClient: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  readData: vi.fn()
}));
vi.mock("server-only", () => ({}));
vi.mock("@next/env", () => ({ loadEnvConfig: mocks.loadEnv }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/db/monthlyReportData", () => ({
  getMonthlyReportData: mocks.readData
}));

import {
  reportCategory,
  reportData,
  reportTransaction,
  REPORT_NOW
} from "@/lib/reports/monthlyExport/fixtures.testSupport";

import { parseMonthlyReportArguments, runMonthlyReport } from "./monthlyReport";

const OWNER_ID = "authenticated-owner";
const client = {
  auth: { signInWithPassword: mocks.signIn, signOut: mocks.signOut }
};
let directory: string;

describe("monthly report command", () => {
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "money-juggle-report-"));
    vi.clearAllMocks();
    vi.stubEnv("ALLOWED_EMAILS", "owner@example.test");
    vi.stubEnv("OWNER_EMAIL", "");
    vi.stubEnv("REPORT_EMAIL", "owner@example.test");
    vi.stubEnv("REPORT_PASSWORD", "test-password");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://database.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
    vi.spyOn(console, "log").mockImplementation(() => {});
    mocks.createClient.mockReturnValue(client);
    mocks.signIn.mockResolvedValue({
      data: {
        user: { id: OWNER_ID, email: "owner@example.test" },
        session: { access_token: "test-token" }
      },
      error: null
    });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.readData.mockResolvedValue(reportData());
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  });

  it("uses Madrid's previous month by default and accepts the provisional current month", () => {
    expect(
      parseMonthlyReportArguments([], new Date("2026-09-30T22:30:00Z"))?.value
    ).toBe("2026-09");
    expect(
      parseMonthlyReportArguments(["--month", "2026-10"], REPORT_NOW)?.value
    ).toBe("2026-10");
  });

  it.each([
    ["--month", "2026-13"],
    ["--month", "2026-11"],
    ["--month", "../outside"],
    ["--month"],
    ["--output", "/tmp/outside.xlsx"],
    ["2026-09"]
  ])(
    "rejects invalid arguments %j before authentication or writes",
    async (...args) => {
      await expect(
        runMonthlyReport(args, directory, REPORT_NOW)
      ).rejects.toThrow();
      expect(mocks.loadEnv).not.toHaveBeenCalled();
      expect(mocks.createClient).not.toHaveBeenCalled();
      expect(await readdir(directory)).toEqual([]);
    }
  );

  it("shows help without loading credentials or connecting", async () => {
    expect(
      await runMonthlyReport(["--help"], directory, REPORT_NOW)
    ).toBeNull();
    expect(mocks.loadEnv).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("blocks a disallowed email before sending credentials", async () => {
    vi.stubEnv("REPORT_EMAIL", "other@example.test");
    await expect(runMonthlyReport([], directory, REPORT_NOW)).rejects.toThrow(
      "Configura REPORT_EMAIL"
    );
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.readData).not.toHaveBeenCalled();
  });

  it("requires a password and requires an explicit email with multiple allowed users", async () => {
    vi.stubEnv("REPORT_PASSWORD", "");
    await expect(runMonthlyReport([], directory, REPORT_NOW)).rejects.toThrow(
      "Falta REPORT_PASSWORD"
    );
    vi.stubEnv("REPORT_PASSWORD", "test-password");
    vi.stubEnv("REPORT_EMAIL", undefined);
    vi.stubEnv("ALLOWED_EMAILS", "owner@example.test,second@example.test");
    await expect(runMonthlyReport([], directory, REPORT_NOW)).rejects.toThrow(
      "Configura REPORT_EMAIL"
    );
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects failed authentication without leaking the provider error", async () => {
    mocks.signIn.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "sensitive-provider-error" }
    });
    await expect(runMonthlyReport([], directory, REPORT_NOW)).rejects.toThrow(
      "No se pudo iniciar sesión en Supabase. Comprueba las credenciales y la conexión."
    );
    expect(mocks.readData).not.toHaveBeenCalled();
    expect(await readdir(directory)).toEqual([]);
  });

  it("checks the authenticated email before financial reads and revokes only the CLI session", async () => {
    mocks.signIn.mockResolvedValue({
      data: {
        user: { id: "other-owner", email: "other@example.test" },
        session: { access_token: "test-token" }
      },
      error: null
    });
    await expect(runMonthlyReport([], directory, REPORT_NOW)).rejects.toThrow(
      "El usuario autenticado no tiene permiso"
    );
    expect(mocks.readData).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(await readdir(directory)).toEqual([]);
  });

  it("writes real workbooks with shared financial rules, authenticated ownership, and distinct filenames", async () => {
    vi.stubEnv("REPORT_EMAIL", undefined);
    mocks.readData.mockResolvedValue(
      reportData({
        transactions: [
          reportTransaction({
            id: "salary",
            amount: "2000",
            category: reportCategory("salary", true)
          }),
          reportTransaction({ id: "expense", amount: "-100" }),
          reportTransaction({ id: "refund", amount: "40" })
        ]
      })
    );
    const first = await runMonthlyReport([], directory, REPORT_NOW);
    const second = await runMonthlyReport(
      ["--month=2026-09"],
      directory,
      REPORT_NOW
    );
    expect(first).not.toBe(second);
    expect(first).toMatch(
      /reports\/Finanzas-2026-09-2026-10-05T10-30-00-000Z-[\da-f-]+\.xlsx$/
    );
    expect(await readdir(join(directory, "reports"))).toHaveLength(2);
    expect(mocks.loadEnv).toHaveBeenCalledWith(
      directory,
      true,
      expect.any(Object)
    );
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://database.example.test",
      "test-public-key",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );
    expect(mocks.signIn).toHaveBeenCalledWith({
      email: "owner@example.test",
      password: "test-password"
    });
    expect(mocks.readData).toHaveBeenCalledWith(
      OWNER_ID,
      { from: "2026-09-01", to: "2026-10-01" },
      client
    );
    const files = unzipSync(await readFile(first!));
    expect(strFromU8(files["xl/workbook.xml"])).toContain('name="Resumen"');
    expect(strFromU8(files["xl/worksheets/sheet1.xml"])).toContain(
      "<v>2000</v>"
    );
    expect(strFromU8(files["xl/worksheets/sheet2.xml"])).toContain("<v>60</v>");
    if (process.platform !== "win32") {
      expect((await stat(first!)).mode & 0o777).toBe(0o600);
      expect((await stat(join(directory, "reports"))).mode & 0o777).toBe(0o700);
    }
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("does not write a report when a financial read fails and still cleans up the session", async () => {
    mocks.readData.mockRejectedValue(new Error("Read unavailable"));
    await expect(runMonthlyReport([], directory, REPORT_NOW)).rejects.toThrow(
      "Read unavailable"
    );
    expect(await readdir(directory)).toEqual([]);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
