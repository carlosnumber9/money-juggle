import { describe, expect, it } from "vitest";

import type { TransactionReconciliationCandidate } from "@/definitions";

import {
  calculateReconciliationBalance,
  getDefaultAdjustmentDate,
  mergeCandidateRows
} from "./reconciliationEditor";

function candidate(
  id: string,
  amount: string,
  reportingDate = "2026-08-01"
): TransactionReconciliationCandidate {
  return {
    id,
    accountId: "account",
    accountName: "Cuenta",
    accountIbanLast4: "1234",
    institutionName: "ING",
    institutionProviderId: "ING",
    bookingStatus: "booked",
    bookingDate: reportingDate,
    reportingDate,
    amount,
    currency: "EUR",
    description: id,
    merchantName: null,
    counterpartyName: null,
    counterpartyAccountLast4: null,
    category: null,
    labels: [],
    isExistingMember: false,
    isInternalTransfer: false
  };
}

describe("reconciliation editor", () => {
  it("calculates exact signed balance", () => {
    expect(
      calculateReconciliationBalance([
        candidate("loan", "800"),
        candidate("repayment", "-800.1")
      ])
    ).toBe("-0.1");
  });

  it("uses latest reporting date for the adjustment", () => {
    expect(
      getDefaultAdjustmentDate([
        candidate("first", "1", "2026-07-30"),
        candidate("second", "-1", "2026-08-02")
      ])
    ).toBe("2026-08-02");
  });

  it("merges pages without duplicate candidates", () => {
    expect(
      mergeCandidateRows(
        [candidate("first", "1")],
        [candidate("first", "1"), candidate("second", "-1")]
      ).map(({ id }) => id)
    ).toEqual(["first", "second"]);
  });
});
