import { describe, expect, it } from "vitest";

import type { MonthlyTransactionSummary } from "@/definitions";

import { groupTransactionsByDate } from "./transactionDateGroups";
import { updateTransactionReportingDateInList } from "./transactionReportingDate";

describe("updateTransactionReportingDateInList", () => {
  it("updates the selected movement and reorders the current list", () => {
    const transactions = [
      createTransaction("second", "2026-08-08"),
      createTransaction("first", "2026-08-07")
    ];

    const result = updateTransactionReportingDateInList(
      transactions,
      "first",
      "2026-08-09"
    );

    expect(
      result.map(({ id, reporting_date }) => ({ id, reporting_date }))
    ).toEqual([
      { id: "first", reporting_date: "2026-08-09" },
      { id: "second", reporting_date: "2026-08-08" }
    ]);
    expect(transactions[1].reporting_date).toBe("2026-08-07");
  });

  it("keeps a movement moved to another month in the local list", () => {
    const result = updateTransactionReportingDateInList(
      [createTransaction("movement", "2026-08-02")],
      "movement",
      "2026-07-31"
    );

    expect(result).toHaveLength(1);
    expect(result[0].reporting_date).toBe("2026-07-31");
  });

  it("groups movements by reporting date instead of bank date", () => {
    const transactions = [
      createTransaction("first", "2026-08-09"),
      createTransaction("second", "2026-08-08")
    ];

    expect(
      groupTransactionsByDate(transactions).map((group) => group.date)
    ).toEqual(["2026-08-09", "2026-08-08"]);
  });
});

function createTransaction(
  id: string,
  reportingDate: string
): MonthlyTransactionSummary {
  return {
    id,
    institution_slug: "caixabank",
    institution_name: "CaixaBank",
    institution_provider_id: "ES:CAIXABANK",
    account_id: "account-id",
    account_name: "Cuenta",
    account_iban_last4: "1234",
    booking_status: "booked",
    booking_date: "2026-08-02",
    reporting_date: reportingDate,
    cashflow_type: "external",
    amount: "-10.00",
    currency: "EUR",
    description: "Movimiento",
    merchant_name: null,
    counterparty_name: null,
    category: null,
    labels: []
  };
}
