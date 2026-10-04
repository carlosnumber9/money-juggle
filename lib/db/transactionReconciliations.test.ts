import { PostgrestClient } from "@supabase/postgrest-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createClient
}));

import { listTransactionReconciliationStates } from "./transactionReconciliations";

const OWNER_ID = "10000000-0000-4000-8000-000000000001";

function transactionId(index: number) {
  return `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function state(index: number, requiresReview = false) {
  return {
    transaction_id: transactionId(index),
    reconciliation_id: "group",
    difference_treatment: "none",
    requires_review: requiresReview
  };
}

function mockResponses(responses: Array<{ data: unknown; status?: number }>) {
  const fetchMock = vi.fn(async () => {
    const response = responses.shift();
    if (!response) throw new Error("Unexpected additional RPC request.");
    return new Response(JSON.stringify(response.data), {
      status: response.status ?? 200,
      headers: { "Content-Type": "application/json" }
    });
  });
  mocks.createClient.mockReturnValue(
    new PostgrestClient("https://database.example.test/rest/v1", {
      fetch: fetchMock
    })
  );
  return fetchMock;
}

describe("reconciliation state RPC", () => {
  beforeEach(() => vi.clearAllMocks());

  it("skips database access when no transactions were loaded", async () => {
    expect(
      await listTransactionReconciliationStates({
        userId: OWNER_ID,
        transactionIds: []
      })
    ).toEqual(new Map());
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("carries a full annual ID set in a POST body instead of URL filters", async () => {
    const fetchMock = mockResponses([{ data: [state(1), state(2, true)] }]);
    const ids = Array.from({ length: 784 }, (_, index) => transactionId(index));
    const result = await listTransactionReconciliationStates({
      userId: OWNER_ID,
      transactionIds: [...ids, ids[0]]
    });
    const [url, options] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit
    ];
    expect(options.method).toBe("POST");
    expect(JSON.parse(String(options.body))).toEqual({
      p_user_id: OWNER_ID,
      p_transaction_ids: ids
    });
    expect(url.length).toBeLessThan(250);
    expect(url).not.toContain(ids[0]);
    expect(result.get(ids[1])).toEqual({
      id: "group",
      differenceTreatment: "none",
      requiresReview: false
    });
    expect(result.get(ids[2])?.requiresReview).toBe(true);
  });

  it("preserves reportable and neutralized states returned by the database", async () => {
    mockResponses([
      {
        data: [
          { ...state(1), difference_treatment: "reportable" },
          { ...state(2), difference_treatment: "neutralized" }
        ]
      }
    ]);
    const result = await listTransactionReconciliationStates({
      userId: OWNER_ID,
      transactionIds: [transactionId(1), transactionId(2)]
    });
    expect(result.get(transactionId(1))?.differenceTreatment).toBe(
      "reportable"
    );
    expect(result.get(transactionId(2))?.differenceTreatment).toBe(
      "neutralized"
    );
  });

  it("loads subsequent ordered pages instead of losing reconciled transactions", async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => state(index));
    const fetchMock = mockResponses([
      { data: firstPage },
      { data: [state(500, true)] }
    ]);
    const result = await listTransactionReconciliationStates({
      userId: OWNER_ID,
      transactionIds: Array.from({ length: 501 }, (_, index) =>
        transactionId(index)
      )
    });
    expect(result.size).toBe(501);
    expect(result.get(transactionId(500))?.requiresReview).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const calls = fetchMock.mock.calls as unknown as Array<
      [string, RequestInit]
    >;
    expect(new URL(calls[0][0]).searchParams.get("order")).toBe(
      "transaction_id.asc"
    );
    expect(new URL(calls[1][0]).searchParams.get("offset")).toBe("500");
    expect(new URL(calls[1][0]).searchParams.get("limit")).toBe("500");
  });

  it("returns an empty map when none of the requested movements is reconciled", async () => {
    mockResponses([{ data: [] }]);
    expect(
      await listTransactionReconciliationStates({
        userId: OWNER_ID,
        transactionIds: [transactionId(1)]
      })
    ).toEqual(new Map());
  });

  it("propagates RPC failures instead of treating missing states as unreconciled", async () => {
    mockResponses([
      { data: { code: "42501", message: "Permission denied" }, status: 403 }
    ]);
    await expect(
      listTransactionReconciliationStates({
        userId: OWNER_ID,
        transactionIds: [transactionId(1)]
      })
    ).rejects.toThrow("Could not load reconciliation state: Permission denied");
  });

  it("rejects a failed later page instead of returning a partial state map", async () => {
    mockResponses([
      { data: Array.from({ length: 500 }, (_, index) => state(index)) },
      { data: { message: "Database unavailable" }, status: 500 }
    ]);
    await expect(
      listTransactionReconciliationStates({
        userId: OWNER_ID,
        transactionIds: Array.from({ length: 501 }, (_, index) =>
          transactionId(index)
        )
      })
    ).rejects.toThrow("Database unavailable");
  });
});
