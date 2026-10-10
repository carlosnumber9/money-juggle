import { PostgrestClient } from "@supabase/postgrest-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: vi.fn(), states: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.client
}));
vi.mock("@/lib/db/transactionReconciliations", () => ({
  listTransactionReconciliationStates: mocks.states
}));

import { getMonthlyReportData } from "./monthlyReportData";
import { readReportAdjustments } from "./monthlyReportData/adjustments";
import { buildMonthlyExportReport } from "@/lib/reports/monthlyExport/buildReport";

const OWNER = "10000000-0000-4000-8000-000000000001";
const RANGE = { from: "2026-09-01", to: "2026-10-01" };
const account = {
  id: "account-a",
  name: "Principal",
  currency: "EUR",
  status: "active",
  iban_last4: "1234",
  iban_fingerprint: "private-fingerprint",
  bank_connection_id: "connection-a",
  bank_connections: { status: "linked", institutions: { name: "ING" } }
};
const category = {
  id: "category",
  name: "Restaurantes",
  slug: "restaurants_bars",
  transaction_category_groups: { id: "expenses", name: "Restauración" }
};
function transaction(index: number) {
  return {
    id: `transaction-${index}`,
    account_id: account.id,
    booking_status: "booked",
    booking_date: "2026-09-10",
    reporting_date: "2026-09-10",
    amount: "-1",
    currency: "EUR",
    description: null,
    merchant_name: null,
    counterparty_name: null,
    counterparty_account_last4: null,
    counterparty_account_fingerprint: null,
    category_id: category.id,
    transaction_categories: category,
    transaction_label_assignments: [],
    accounts: account
  };
}

function mockDatabase(
  tables: Record<string, unknown[]>,
  failureTable?: string
) {
  const urls: URL[] = [];
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    urls.push(url);
    const table = url.pathname.split("/").at(-1)!;
    if (table === failureTable)
      return new Response(
        JSON.stringify({ message: "Read unavailable", code: "error" }),
        { status: 500 }
      );
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? 500);
    let rows = tables[table] ?? [];
    const balanceTypes = url.searchParams.get("balance_type");
    if (table === "balances" && balanceTypes?.startsWith("in.(")) {
      const includedTypes = balanceTypes.slice(4, -1).split(",");
      rows = rows.filter((row) =>
        includedTypes.includes((row as { balance_type: string }).balance_type)
      );
    }
    return new Response(JSON.stringify(rows.slice(offset, offset + limit)), {
      headers: { "Content-Type": "application/json" }
    });
  });
  const client = new PostgrestClient("https://database.example.test/rest/v1", {
    fetch: fetchMock
  });
  mocks.client.mockReturnValue(client);
  return { urls, client };
}

describe("monthly report database reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.states.mockResolvedValue(new Map());
  });

  it("paginates transactions and matching context, filters owner and status, and uses both date axes", async () => {
    const { urls, client } = mockDatabase({
      accounts: [account],
      transactions: Array.from({ length: 501 }, (_, index) =>
        transaction(index)
      ),
      transaction_category_groups: [
        { id: "income-group", name: "Ingresos", slug: "income" }
      ],
      sync_runs: [{ finished_at: "2026-10-01T10:00:00Z", status: "succeeded" }]
    });
    const data = await getMonthlyReportData(OWNER, RANGE);
    expect(data.transactions).toHaveLength(501);
    expect(data.accounts[0]).toMatchObject({
      institution: "ING",
      name: "Principal · •••• 1234"
    });
    expect(data.categoryGroups[0].slug).toBe("income");
    for (const url of urls)
      expect(url.searchParams.get("user_id")).toBe(`eq.${OWNER}`);
    const mainReads = urls.filter(
      (url) =>
        url.pathname.endsWith("/transactions") && url.searchParams.has("or")
    );
    expect(mainReads).toHaveLength(2);
    expect(mainReads[0].searchParams.get("or")).toContain(
      "reporting_date.gte.2026-09-01"
    );
    expect(mainReads[0].searchParams.get("or")).toContain(
      "booking_date.gte.2026-09-01"
    );
    expect(mainReads[1].searchParams.get("offset")).toBe("500");
    for (const url of urls.filter((value) =>
      value.pathname.endsWith("/transactions")
    ))
      expect(url.searchParams.get("booking_status")).toBe("eq.booked");
    expect(mocks.states).toHaveBeenCalledWith(
      {
        userId: OWNER,
        transactionIds: expect.arrayContaining(["transaction-500"])
      },
      client
    );
  });

  it("uses the injected authenticated client for every report read without requesting Next.js cookies", async () => {
    const { urls } = mockDatabase({
      accounts: [account],
      transactions: [transaction(1)]
    });
    const client = await mocks.client();
    mocks.client.mockClear();
    await getMonthlyReportData(OWNER, RANGE, client);
    expect(mocks.client).not.toHaveBeenCalled();
    expect(mocks.states).toHaveBeenCalledWith(
      { userId: OWNER, transactionIds: ["transaction-1"] },
      client
    );
    expect(
      urls.some((url) => url.pathname.endsWith("/transaction_reconciliations"))
    ).toBe(true);
    for (const url of urls)
      expect(url.searchParams.get("user_id")).toBe(`eq.${OWNER}`);
  });

  it("fails a required read instead of treating failed queries as an empty month", async () => {
    mockDatabase({ accounts: [account] }, "balances");
    await expect(getMonthlyReportData(OWNER, RANGE)).rejects.toThrow(
      "Read unavailable"
    );
  });

  it("exports Trade Republic's OTHR cash observations while retaining date and booked-balance limits", async () => {
    const tradeRepublic = {
      ...account,
      id: "trade-republic-account",
      name: "Cash account",
      bank_connections: {
        status: "linked",
        institutions: [{ name: "Trade Republic" }]
      }
    };
    const { urls } = mockDatabase({
      accounts: [tradeRepublic],
      balances: [
        {
          account_id: tradeRepublic.id,
          amount: "2000",
          currency: "EUR",
          balance_type: "OTHR",
          reference_date: "2026-09-01",
          fetched_at: "2026-09-01T09:00:00Z"
        },
        {
          account_id: tradeRepublic.id,
          amount: "750",
          currency: "EUR",
          balance_type: "OTHR",
          reference_date: "2026-09-18",
          fetched_at: "2026-09-18T18:00:00Z"
        },
        {
          account_id: tradeRepublic.id,
          amount: "3000",
          currency: "EUR",
          balance_type: "OTHR",
          reference_date: "2026-10-05",
          fetched_at: "2026-10-05T09:00:00Z"
        }
      ]
    });
    const data = await getMonthlyReportData(OWNER, RANGE);
    const report = buildMonthlyExportReport(
      data,
      "2026-09",
      new Date("2026-10-10T12:00:00Z")
    );
    expect(report.accounts[0]).toMatchObject({
      institution: "Trade Republic",
      firstBalance: "2000",
      firstDate: "2026-09-01",
      firstDateSource: "bank",
      lastBalance: "750",
      lastDate: "2026-09-18",
      lastDateSource: "bank",
      variation: "-1250",
      reconciliationDifference: null
    });
    expect(report.accounts[0].observations).not.toContain(
      "Saldos históricos del mes no disponibles"
    );
    expect(report.accounts[0].observations).toContain(
      "Cuadre mensual no comparable"
    );
    const balanceQuery = urls.find((url) =>
      url.pathname.endsWith("/balances")
    )!;
    expect(balanceQuery.searchParams.get("user_id")).toBe(`eq.${OWNER}`);
    expect(balanceQuery.searchParams.get("or")).toContain(
      "reference_date.gte.2026-09-01"
    );
    expect(balanceQuery.searchParams.get("or")).toContain(
      "reference_date.lt.2026-10-01"
    );
  });

  it("keeps OTHR specific to Trade Republic and preserves standard balance types for other institutions", async () => {
    const tradeRepublic = {
      ...account,
      id: "trade-account",
      bank_connections: [
        { status: "linked", institutions: { name: "Trade-Republic" } }
      ]
    };
    mockDatabase({
      accounts: [tradeRepublic, account],
      balances: [
        {
          account_id: tradeRepublic.id,
          amount: "500",
          currency: "EUR",
          balance_type: "OTHR",
          reference_date: "2026-09-10",
          fetched_at: "2026-09-10T09:00:00Z"
        },
        {
          account_id: account.id,
          amount: "9000",
          currency: "EUR",
          balance_type: "OTHR",
          reference_date: "2026-09-10",
          fetched_at: "2026-09-10T09:00:00Z"
        },
        {
          account_id: account.id,
          amount: "1000",
          currency: "EUR",
          balance_type: "CLBD",
          reference_date: "2026-09-10",
          fetched_at: "2026-09-10T09:00:00Z"
        },
        {
          account_id: tradeRepublic.id,
          amount: "8000",
          currency: "EUR",
          balance_type: "INFO",
          reference_date: "2026-09-10",
          fetched_at: "2026-09-10T09:00:00Z"
        }
      ]
    });
    const data = await getMonthlyReportData(OWNER, RANGE);
    expect(
      data.balances.map((balance) => [
        balance.account_id,
        balance.balance_type,
        balance.amount
      ])
    ).toEqual([
      [tradeRepublic.id, "OTHR", "500"],
      [account.id, "CLBD", "1000"]
    ]);
  });

  it("reads all reconciliation members using real composite-key columns", async () => {
    const { urls } = mockDatabase({
      transaction_reconciliations: [
        {
          id: "group",
          currency: "EUR",
          adjustment_reporting_date: "2026-09-20",
          transaction_categories: category
        }
      ],
      transaction_reconciliation_items: Array.from(
        { length: 501 },
        (_, index) => ({
          transaction_id: `member-${index}`,
          reconciliation_id: "group",
          transactions: { amount: "0.1", booking_status: "booked" }
        })
      )
    });
    const result = await readReportAdjustments(OWNER, RANGE);
    expect(result.adjustments[0]).toMatchObject({
      amount: "50.1",
      reportingDate: "2026-09-20"
    });
    expect(result.unavailableAdjustmentCount).toBe(0);
    const reads = urls.filter((url) =>
      url.pathname.endsWith("/transaction_reconciliation_items")
    );
    expect(reads).toHaveLength(2);
    expect(reads[0].searchParams.get("order")).toBe(
      "reconciliation_id.asc,transaction_id.asc"
    );
    expect(reads[0].searchParams.get("select")).not.toMatch(/^id,/);
    for (const url of urls)
      expect(url.searchParams.get("user_id")).toBe(`eq.${OWNER}`);
  });

  it("flags adjustments containing unbooked or missing members instead of estimating a residual", async () => {
    mockDatabase({
      transaction_reconciliations: [
        {
          id: "group",
          currency: "EUR",
          adjustment_reporting_date: "2026-09-20",
          transaction_categories: category
        }
      ],
      transaction_reconciliation_items: [
        {
          transaction_id: "first",
          reconciliation_id: "group",
          transactions: { amount: "-100", booking_status: "booked" }
        },
        {
          transaction_id: "second",
          reconciliation_id: "group",
          transactions: { amount: "40", booking_status: "pending" }
        }
      ]
    });
    expect(await readReportAdjustments(OWNER, RANGE)).toEqual({
      adjustments: [],
      unavailableAdjustmentCount: 1
    });
  });
});
