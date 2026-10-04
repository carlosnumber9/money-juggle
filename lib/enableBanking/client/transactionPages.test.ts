import { describe, expect, it } from "vitest";
import type { EnableBankingTransactionResource } from "@/definitions";
import { appendTransactionPage } from "./transactionPages";

describe("continuation page reconciliation", () => {
  it("keeps updated provider fields when a movement repeats", () => {
    const rows: EnableBankingTransactionResource[] = [];
    const indices = new Map<string, number>();
    appendTransactionPage(rows, indices, [
      { transaction_id: "movement", booking_status: "pending" }
    ]);
    appendTransactionPage(rows, indices, [
      { transaction_id: "movement", booking_status: "booked" },
      { transaction_id: "other" }
    ]);
    expect(rows).toEqual([
      { transaction_id: "movement", booking_status: "booked" },
      { transaction_id: "other" }
    ]);
  });
  it("does not collapse unidentified but otherwise identical movements", () => {
    const rows: EnableBankingTransactionResource[] = [];
    appendTransactionPage(rows, new Map(), [
      { description: "Same amount" },
      { description: "Same amount" }
    ]);
    expect(rows).toHaveLength(2);
  });
});
