import { describe, expect, it } from "vitest";

import { buildMonthlyExportReport } from "./buildReport";
import {
  reportCategory,
  reportData,
  reportTransaction,
  REPORT_MONTH,
  REPORT_NOW
} from "./fixtures.testSupport";

function build(data: Parameters<typeof reportData>[0] = {}) {
  return buildMonthlyExportReport(reportData(data), REPORT_MONTH, REPORT_NOW);
}

describe("monthly export financial calculations", () => {
  it("nets refunds against expenses, reversals against income, and includes mortgage", () => {
    const report = build({
      transactions: [
        reportTransaction({ id: "purchase", amount: "-100" }),
        reportTransaction({ id: "refund", amount: "40" }),
        reportTransaction({
          id: "salary",
          amount: "2000",
          category: reportCategory("salary", true)
        }),
        reportTransaction({
          id: "reversal",
          amount: "-100",
          category: reportCategory("salary", true)
        }),
        reportTransaction({
          id: "mortgage",
          amount: "-500",
          category: reportCategory("mortgage")
        })
      ]
    });
    expect(report.totals[0]).toMatchObject({
      income: "1900",
      expenses: "560",
      surplus: "1340"
    });
    expect(
      report.categories.find(
        (row) => row.subcategory === "Restaurantes y bares"
      )
    ).toMatchObject({ income: "0", expenses: "60", net: "-60" });
    expect(report.accounts[0]).toMatchObject({
      inflows: "2040",
      outflows: "700"
    });
  });

  it("preserves negative and zero net category expenses with exact decimal arithmetic", () => {
    const report = build({
      transactions: [
        reportTransaction({ id: "first", amount: "-0.1" }),
        reportTransaction({ id: "second", amount: "0.2" }),
        reportTransaction({
          id: "third",
          amount: "-0.1",
          category: reportCategory("mortgage")
        }),
        reportTransaction({
          id: "fourth",
          amount: "0.1",
          category: reportCategory("mortgage")
        })
      ]
    });
    expect(report.totals[0]).toMatchObject({
      income: "0",
      expenses: "-0.1",
      surplus: "0.1"
    });
    expect(
      report.categories.find((row) => row.subcategory === "mortgage")?.expenses
    ).toBe("0");
  });

  it("excludes both directions of savings, investment, cash and internal transfers from economic totals", () => {
    const report = build({
      transactions: [
        ...[
          "savings_transfer",
          "investment_transfer",
          "cash_withdrawal"
        ].flatMap((slug, index) => [
          reportTransaction({
            id: `${index}-out`,
            amount: "-500",
            category: reportCategory(slug)
          }),
          reportTransaction({
            id: `${index}-in`,
            amount: "200",
            category: reportCategory(slug)
          })
        ]),
        reportTransaction({
          id: "internal",
          amount: "-900",
          cashflow_type: "internal_transfer",
          category: null
        })
      ]
    });
    expect(report.totals[0]).toMatchObject({
      income: "0",
      expenses: "0",
      neutral: "-1800",
      uncategorized: "0"
    });
    expect(report.categories.map((row) => row.treatment).sort()).toEqual([
      "cash",
      "internal_transfer",
      "investment",
      "savings"
    ]);
    expect(report.accounts[0]).toMatchObject({
      inflows: "600",
      outflows: "2400"
    });
  });

  it("only reports uncategorized net balance and never silently classifies it", () => {
    const report = build({
      transactions: [
        reportTransaction({
          id: "uncategorized-credit",
          amount: "300",
          category: null
        }),
        reportTransaction({
          id: "uncategorized-debit",
          amount: "-50",
          category: null
        })
      ]
    });
    expect(report.categories[0]).toMatchObject({
      net: "250",
      income: null,
      expenses: null
    });
    expect(report.totals[0]).toMatchObject({
      income: "0",
      expenses: "0",
      uncategorized: "250"
    });
    expect(report.observations.join(" ")).toContain(
      "fuera de ingresos y gastos"
    );
  });

  it("honors configured reconciliation date and reports its residual exactly once without an account", () => {
    const reconciliation = {
      id: "secret-group",
      differenceTreatment: "reportable" as const,
      requiresReview: false
    };
    const data = reportData({
      accounts: [
        ...reportData().accounts,
        { ...reportData().accounts[0], id: "account-b", name: "Secundaria" }
      ],
      transactions: [
        reportTransaction({
          id: "charge",
          amount: "-100",
          reporting_date: "2026-08-15",
          booking_date: "2026-09-01",
          reconciliation
        }),
        reportTransaction({
          id: "refund",
          account_id: "account-b",
          amount: "40",
          reconciliation
        })
      ],
      adjustments: [
        {
          reconciliationId: "secret-group",
          reportingDate: "2026-09-20",
          amount: "-60",
          currency: "EUR",
          category: reportCategory(),
          labels: []
        }
      ]
    });
    const report = buildMonthlyExportReport(data, REPORT_MONTH, REPORT_NOW);
    expect(report.categories).toHaveLength(1);
    expect(report.categories[0]).toMatchObject({
      account: "Ajustes sin cuenta",
      expenses: "60"
    });
    expect(report.accounts[0]).toMatchObject({
      inflows: "0",
      outflows: "100"
    });
    expect(report.accounts[1]).toMatchObject({ inflows: "40", outflows: "0" });
    expect(
      buildMonthlyExportReport(data, "2026-08", REPORT_NOW).totals[0].expenses
    ).toBe("0");
  });

  it("keeps bank dates separate from economic dates and ignores unbooked movements", () => {
    const report = build({
      transactions: [
        reportTransaction({
          id: "delayed-salary",
          amount: "1000",
          category: reportCategory("salary", true),
          booking_date: "2026-10-01"
        }),
        reportTransaction({
          id: "previous-month-charge",
          amount: "-25",
          reporting_date: "2026-08-31"
        }),
        reportTransaction({
          id: "pending",
          amount: "9999",
          booking_status: "pending"
        }),
        reportTransaction({
          id: "information",
          amount: "9999",
          booking_status: "information"
        })
      ]
    });
    expect(report.totals[0]).toMatchObject({ income: "1000", expenses: "0" });
    expect(report.accounts[0]).toMatchObject({ inflows: "0", outflows: "25" });
    expect(report.accounts[0].observations).toContain("1000 EUR");
    expect(report.accounts[0].observations).toContain("-25 EUR");
  });

  it("keeps currencies apart and derives totals from the same account-category rows", () => {
    const report = build({
      transactions: [
        reportTransaction({ id: "eur", amount: "-10" }),
        reportTransaction({ id: "usd", amount: "-20", currency: "USD" })
      ]
    });
    expect(
      report.totals.map((total) => [total.currency, total.expenses])
    ).toEqual([
      ["EUR", "10"],
      ["USD", "20"]
    ]);
    expect(
      report.accounts.map((account) => [account.currency, account.outflows])
    ).toEqual([
      ["EUR", "10"],
      ["USD", "20"]
    ]);
  });

  it("does not invent balances or complete coverage in empty months", () => {
    const report = build();
    expect(report.accounts[0]).toMatchObject({
      firstBalance: null,
      lastBalance: null,
      variation: null,
      reconciliationDifference: null
    });
    expect(report.observations.join(" ")).toContain("no demuestra ausencia");
    expect(report.accounts[0].observations).toContain("no disponibles");
    expect(report.provisional).toBe(false);
  });

  it("flags ongoing months, unavailable adjustments and reconciliations requiring review", () => {
    const report = buildMonthlyExportReport(
      reportData({
        unavailableAdjustmentCount: 1,
        transactions: [
          reportTransaction({
            reporting_date: "2026-10-01",
            booking_date: null,
            reconciliation: {
              id: "group",
              differenceTreatment: "none",
              requiresReview: true
            }
          })
        ]
      }),
      "2026-10",
      REPORT_NOW
    );
    expect(report.provisional).toBe(true);
    expect(report.observations.join(" ")).toContain("requieren revisión");
    expect(report.observations.join(" ")).toContain(
      "ajustes de compensación no disponibles"
    );
    expect(report.accounts[0].observations).toContain("sin fecha bancaria");
  });
});
