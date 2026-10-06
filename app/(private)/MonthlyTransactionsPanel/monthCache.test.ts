import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import type { TransactionMonthData } from "@/definitions";
import {
  createPrivateQueryClient,
  invalidateTransactionMonths,
  MONTH_GC_MS,
  MONTH_STALE_MS,
  monthKey,
  patchMonthRows
} from "./monthCache";

let client: QueryClient;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-06T10:00:00Z"));
  client = createPrivateQueryClient();
});
afterEach(() => {
  client.clear();
  vi.useRealTimers();
});
function data(month: string): TransactionMonthData {
  return {
    selectedMonth: {
      value: month,
      label: month,
      previousMonth: "2026-06",
      nextMonth: null
    },
    range: { from: `${month}-01`, to: `${month}-28` },
    rows: [],
    categoryGroups: [],
    labels: [],
    error: null,
    loadedAt: Date.now()
  };
}

describe("private month cache", () => {
  it("does not reread hydrated August or a fresh month revisited from July", async () => {
    client.setQueryData(monthKey("owner", "2026-08"), data("2026-08"), {
      updatedAt: Date.now()
    });
    const read = vi.fn(async () => data("2026-07"));
    await client.fetchQuery({
      queryKey: monthKey("owner", "2026-08"),
      queryFn: read
    });
    await client.fetchQuery({
      queryKey: monthKey("owner", "2026-07"),
      queryFn: read
    });
    await client.fetchQuery({
      queryKey: monthKey("owner", "2026-08"),
      queryFn: read
    });
    expect(read).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(MONTH_STALE_MS + 1);
    await client.fetchQuery({
      queryKey: monthKey("owner", "2026-08"),
      queryFn: read
    });
    expect(read).toHaveBeenCalledTimes(2);
  });
  it("deduplicates simultaneous reads and caches empty months", async () => {
    let finish!: (data: TransactionMonthData) => void;
    const read = vi.fn(
      () =>
        new Promise<TransactionMonthData>((resolve) => {
          finish = resolve;
        })
    );
    const options = { queryKey: monthKey("owner", "2026-07"), queryFn: read };
    const first = client.fetchQuery(options);
    const second = client.fetchQuery(options);
    finish(data("2026-07"));
    await Promise.all([first, second]);
    await client.fetchQuery(options);
    expect(read).toHaveBeenCalledOnce();
  });
  it("keeps failures retryable and isolated between users", async () => {
    const fail = vi.fn().mockRejectedValue(new Error("Network failed"));
    await expect(
      client.fetchQuery({
        queryKey: monthKey("owner", "2026-08"),
        queryFn: fail
      })
    ).rejects.toThrow("Network failed");
    expect(fail).toHaveBeenCalledOnce();
    expect(client.getQueryData(monthKey("owner", "2026-08"))).toBeUndefined();
    const read = vi.fn(async () => data("2026-08"));
    await client.fetchQuery({
      queryKey: monthKey("other", "2026-08"),
      queryFn: read
    });
    await client.fetchQuery({
      queryKey: monthKey("owner", "2026-08"),
      queryFn: read
    });
    expect(read).toHaveBeenCalledTimes(2);
    await invalidateTransactionMonths(client, "owner");
    expect(
      client.getQueryState(monthKey("other", "2026-08"))?.isInvalidated
    ).toBe(false);
  });
  it("invalidates source and destination across years without invalidating another month", async () => {
    for (const month of ["2025-12", "2026-01", "2026-02"])
      client.setQueryData(monthKey("owner", month), data(month));
    await invalidateTransactionMonths(client, "owner", [
      "2026-01",
      "2025-12",
      "2025-12"
    ]);
    expect(
      client.getQueryState(monthKey("owner", "2025-12"))?.isInvalidated
    ).toBe(true);
    expect(
      client.getQueryState(monthKey("owner", "2026-01"))?.isInvalidated
    ).toBe(true);
    expect(
      client.getQueryState(monthKey("owner", "2026-02"))?.isInvalidated
    ).toBe(false);
  });
  it("prevents a late read from overwriting an optimistic edit", async () => {
    const key = monthKey("owner", "2026-08");
    client.setQueryData(key, data("2026-08"));
    let finish!: (data: TransactionMonthData) => void;
    const pending = client
      .fetchQuery({
        queryKey: key,
        staleTime: 0,
        queryFn: () =>
          new Promise<TransactionMonthData>((resolve) => {
            finish = resolve;
          })
      })
      .catch(() => null);
    await patchMonthRows(client, "owner", "2026-08", (rows) => [
      ...rows,
      { id: "updated" } as TransactionMonthData["rows"][number]
    ]);
    finish(data("2026-08"));
    await pending;
    expect(client.getQueryData<TransactionMonthData>(key)?.rows[0].id).toBe(
      "updated"
    );
  });
  it("collects inactive financial data after thirty minutes", async () => {
    const key = monthKey("owner", "2026-08");
    await client.fetchQuery({
      queryKey: key,
      queryFn: async () => data("2026-08")
    });
    vi.advanceTimersByTime(MONTH_GC_MS - 1);
    expect(client.getQueryData(key)).toBeDefined();
    vi.advanceTimersByTime(1);
    expect(client.getQueryData(key)).toBeUndefined();
  });
});
