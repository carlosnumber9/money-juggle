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

  it("retains completed pages and discards a page with a repeated key", async () => {
    requestEnableBankingMock
      .mockResolvedValueOnce({
        transactions: [{ transaction_id: "transaction-1" }],
        continuation_key: "continuation-1"
      })
      .mockResolvedValueOnce({
        transactions: [{ transaction_id: "transaction-1" }],
        continuation_key: "continuation-1"
      });

    await expect(fetchTransactions()).resolves.toEqual({
      transactions: [{ transaction_id: "transaction-1" }],
      paginationTruncated: true
    });
    expect(requestEnableBankingMock).toHaveBeenCalledTimes(2);
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
