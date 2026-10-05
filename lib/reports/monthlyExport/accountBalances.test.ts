import { describe, expect, it } from "vitest";
import type { MonthlyReportBalance } from "@/definitions";

import { selectReportBalances } from "./accountBalances";
import { buildMonthlyExportReport } from "./buildReport";
import {
  reportData,
  reportTransaction,
  REPORT_MONTH,
  REPORT_NOW
} from "./fixtures.testSupport";

const range = { from: "2026-09-01", to: "2026-10-01" };
function balance(
  overrides: Partial<MonthlyReportBalance> = {}
): MonthlyReportBalance {
  return {
    account_id: "account-a",
    amount: "1000",
    currency: "EUR",
    reference_date: "2026-09-10",
    fetched_at: "2026-09-10T12:00:00Z",
    balance_type: "CLBD",
    ...overrides
  };
}

describe("historical export balances", () => {
  it("prefers booked balance in the same capture but never replaces month history with today's balance", () => {
    const booked = balance();
    const selected = selectReportBalances(
      [
        booked,
        balance({ balance_type: "CLAV", amount: "900" }),
        balance({
          reference_date: "2026-10-05",
          fetched_at: "2026-10-05T00:00:00Z"
        })
      ],
      range
    );
    expect(selected.first).toEqual(booked);
    expect(selected.last).toEqual(booked);
    expect(selected.comparable).toBe(false);
  });

  it("uses Madrid capture date when bank reference date is missing", () => {
    const captured = balance({
      reference_date: null,
      fetched_at: "2026-08-31T22:15:00Z"
    });
    const selected = selectReportBalances(
      [
        captured,
        balance({ reference_date: null, fetched_at: "2026-09-30T22:15:00Z" })
      ],
      range
    );
    expect(selected.first).toEqual(captured);
    expect(selected.last).toEqual(captured);
    expect(selected.comparable).toBe(false);
  });

  it("only reconciles exact opening and closing booked balances and exposes differences", () => {
    const opening = balance({
      reference_date: "2026-09-01",
      balance_type: "OPBD",
      fetched_at: "2026-09-01T12:00:00Z"
    });
    const openingDayClosing = balance({
      reference_date: "2026-09-01",
      fetched_at: opening.fetched_at,
      amount: "1100"
    });
    const closing = balance({
      reference_date: "2026-09-30",
      fetched_at: "2026-09-30T12:00:00Z",
      amount: "1080"
    });
    const data = reportData({
      balances: [opening, openingDayClosing, closing],
      transactions: [
        reportTransaction({ id: "credit", amount: "100" }),
        reportTransaction({ id: "debit", amount: "-20" })
      ]
    });
    const row = buildMonthlyExportReport(data, REPORT_MONTH, REPORT_NOW)
      .accounts[0];
    expect(row).toMatchObject({
      firstBalance: "1000",
      lastBalance: "1080",
      variation: "80",
      reconciliationDifference: "0"
    });
    data.balances[2].amount = "1090";
    const changed = buildMonthlyExportReport(data, REPORT_MONTH, REPORT_NOW)
      .accounts[0];
    expect(changed.reconciliationDifference).toBe("-10");
    expect(changed.observations).toContain("Diferencia de cuadre");
  });
});
