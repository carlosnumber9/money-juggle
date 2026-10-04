import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./request", () => ({
  requestEnableBanking: vi.fn()
}));

import { requestEnableBanking } from "./request";
import { getEnableBankingAccountTransactions } from "./endpoints";

const requestEnableBankingMock = vi.mocked(requestEnableBanking);

describe("getEnableBankingAccountTransactions", () => {
  beforeEach(() => {
    requestEnableBankingMock.mockReset();
  });

  it("returns a complete unpaginated response", async () => {
    requestEnableBankingMock.mockResolvedValueOnce({
      transactions: [{ transaction_id: "transaction-1" }],
      continuation_key: null
    });

    await expect(fetchTransactions()).resolves.toEqual({
      transactions: [{ transaction_id: "transaction-1" }],
      paginationTruncated: false
    });
  });

  it("keeps request parameters consistent across pages", async () => {
    requestEnableBankingMock
      .mockResolvedValueOnce({
        transactions: [{ transaction_id: "transaction-1" }],
        continuation_key: "continuation-1"
      })
      .mockResolvedValueOnce({
        transactions: [{ transaction_id: "transaction-2" }],
        continuation_key: null
      });

    await expect(fetchTransactions()).resolves.toEqual({
      transactions: [
        { transaction_id: "transaction-1" },
        { transaction_id: "transaction-2" }
      ],
      paginationTruncated: false
    });
    expect(requestEnableBankingMock).toHaveBeenNthCalledWith(
      2,
      "/accounts/account-id/transactions?date_from=2026-07-01&date_to=2026-08-30&strategy=default&continuation_key=continuation-1",
      { psuHeaders: undefined }
    );
  });

  it("retains unique movements and stops after bounded repeated-key retries", async () => {
    requestEnableBankingMock
      .mockResolvedValueOnce({
        transactions: [{ transaction_id: "transaction-1" }],
        continuation_key: "continuation-1"
      })
      .mockResolvedValue({
        transactions: [{ transaction_id: "transaction-1" }],
        continuation_key: "continuation-1"
      });

    await expect(fetchTransactions()).resolves.toEqual({
      transactions: [{ transaction_id: "transaction-1" }],
      paginationTruncated: true,
      paginationTruncationReason: "repeated-continuation-key"
    });
    expect(requestEnableBankingMock).toHaveBeenCalledTimes(4);
  });
  it("retains new movements returned with a repeated key and can recover", async () => {
    requestEnableBankingMock
      .mockResolvedValueOnce({
        transactions: [{ transaction_id: "first" }],
        continuation_key: "same"
      })
      .mockResolvedValueOnce({
        transactions: [{ transaction_id: "second" }],
        continuation_key: "same"
      })
      .mockResolvedValueOnce({
        transactions: [{ transaction_id: "third" }],
        continuation_key: null
      });
    await expect(fetchTransactions()).resolves.toEqual({
      transactions: [
        { transaction_id: "first" },
        { transaction_id: "second" },
        { transaction_id: "third" }
      ],
      paginationTruncated: false
    });
    expect(requestEnableBankingMock).toHaveBeenCalledTimes(3);
  });
  it("continues empty pages and preserves PSU headers on every request", async () => {
    requestEnableBankingMock
      .mockResolvedValueOnce({ transactions: [], continuation_key: "next" })
      .mockResolvedValueOnce({
        transactions: [{ transaction_id: "first" }],
        continuation_key: null
      });
    const psuHeaders = { "Psu-Ip-Address": "192.0.2.1" };
    await expect(
      getEnableBankingAccountTransactions({
        accountId: "account-id",
        dateFrom: "2026-07-01",
        dateTo: "2026-08-30",
        strategy: "default",
        psuHeaders
      })
    ).resolves.toMatchObject({
      paginationTruncated: false,
      transactions: [{ transaction_id: "first" }]
    });
    expect(requestEnableBankingMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("continuation_key=next"),
      { psuHeaders }
    );
  });
  it("stops cycling continuation keys", async () => {
    let calls = 0;
    requestEnableBankingMock.mockImplementation(async () => ({
      transactions: [],
      continuation_key: calls++ % 2 === 0 ? "A" : "B"
    }));
    await expect(fetchTransactions()).resolves.toMatchObject({
      paginationTruncated: true,
      paginationTruncationReason: "repeated-continuation-key"
    });
    expect(requestEnableBankingMock).toHaveBeenCalledTimes(5);
  });
  it("preserves previous pages when a later request fails", async () => {
    const error = new Error("Network failed");
    requestEnableBankingMock
      .mockResolvedValueOnce({
        transactions: [{ transaction_id: "saved" }],
        continuation_key: "next"
      })
      .mockRejectedValueOnce(error);
    await expect(fetchTransactions()).resolves.toEqual({
      transactions: [{ transaction_id: "saved" }],
      paginationTruncated: true,
      paginationTruncationReason: "request-failed",
      pageError: error
    });
  });
  it("propagates a failure before any page was received", async () => {
    requestEnableBankingMock.mockRejectedValueOnce(
      new Error("Initial fetch failed")
    );
    await expect(fetchTransactions()).rejects.toThrow("Initial fetch failed");
  });
  it("caps even a stream of unique continuation keys", async () => {
    let calls = 0;
    requestEnableBankingMock.mockImplementation(async () => ({
      transactions: [{ transaction_id: `movement-${calls}` }],
      continuation_key: `key-${++calls}`
    }));
    const result = await fetchTransactions();
    expect(result).toMatchObject({
      paginationTruncated: true,
      paginationTruncationReason: "page-limit"
    });
    expect(result.transactions).toHaveLength(100);
    expect(requestEnableBankingMock).toHaveBeenCalledTimes(100);
  });
});

function fetchTransactions() {
  return getEnableBankingAccountTransactions({
    accountId: "account-id",
    dateFrom: "2026-07-01",
    dateTo: "2026-08-30",
    strategy: "default"
  });
}
