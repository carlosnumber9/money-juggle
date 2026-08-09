import type {
  MonthlyTransactionCategory,
  MonthlyTransactionSummary
} from "@/definitions";
import { describe, expect, it } from "vitest";

import { buildMonthlyCategoryExpensesSummary } from "./monthlyCategoryExpenses";

describe("buildMonthlyCategoryExpensesSummary", () => {
  it("subtracts category income from expenses to produce net spending", () => {
    const restaurant = createCategory({
      id: "restaurant",
      name: "Restaurantes",
      slug: "restaurants"
    });
    const summary = buildMonthlyCategoryExpensesSummary({
      periodStart: "2026-07-01",
      transactions: [
        createTransaction({
          id: "expense",
          amount: "-80",
          category: restaurant
        }),
        createTransaction({
          id: "refund",
          amount: "20",
          category: restaurant
        })
      ]
    });

    expect(summary.points).toEqual([
      {
        categoryId: "restaurant",
        categoryName: "Restaurantes",
        categoryGroupName: "Ocio",
        expenses: 60,
        transactionCount: 2
      }
    ]);
    expect(summary.totalExpenses).toBe(60);
    expect(summary.transactionCount).toBe(2);
  });

  it("applies each signed amount only to its assigned category", () => {
    const restaurants = createCategory({
      id: "restaurants",
      name: "Restaurantes",
      slug: "restaurants"
    });
    const groceries = createCategory({
      id: "groceries",
      name: "Supermercado",
      slug: "groceries"
    });
    const summary = buildMonthlyCategoryExpensesSummary({
      periodStart: "2026-07-01",
      transactions: [
        createTransaction({ amount: "-80", category: restaurants }),
        createTransaction({ amount: "20", category: restaurants }),
        createTransaction({ amount: "-45", category: groceries }),
        createTransaction({ amount: "5", category: groceries })
      ]
    });

    expect(
      summary.points.map(({ categoryId, expenses }) => ({
        categoryId,
        expenses
      }))
    ).toEqual([
      { categoryId: "restaurants", expenses: 60 },
      { categoryId: "groceries", expenses: 40 }
    ]);
    expect(summary.totalExpenses).toBe(100);
  });

  it("omits categories whose net total is income or zero", () => {
    const restaurants = createCategory({
      id: "restaurants",
      name: "Restaurantes",
      slug: "restaurants"
    });
    const rewards = createCategory({
      id: "rewards",
      name: "Recompensas",
      slug: "rewards"
    });
    const transport = createCategory({
      id: "transport",
      name: "Transporte",
      slug: "transport"
    });
    const salary = createCategory({
      id: "salary",
      name: "Salario",
      slug: "salary"
    });
    const summary = buildMonthlyCategoryExpensesSummary({
      periodStart: "2026-07-01",
      transactions: [
        createTransaction({ amount: "-80", category: restaurants }),
        createTransaction({ amount: "20", category: restaurants }),
        createTransaction({ amount: "-20", category: rewards }),
        createTransaction({ amount: "50", category: rewards }),
        createTransaction({ amount: "-10", category: transport }),
        createTransaction({ amount: "10", category: transport }),
        createTransaction({ amount: "40", category: salary })
      ]
    });

    expect(summary.points).toEqual([
      {
        categoryId: "restaurants",
        categoryName: "Restaurantes",
        categoryGroupName: "Ocio",
        expenses: 60,
        transactionCount: 2
      }
    ]);
    expect(summary.totalExpenses).toBe(60);
    expect(summary.transactionCount).toBe(2);
  });

  it("keeps exclusions while counting only uncategorized expenses", () => {
    const excludedCategories = [
      createCategory({
        id: "shared-expense-settlement",
        name: "Liquidación de gastos compartidos",
        slug: "shared_expense_settlement"
      }),
      createCategory({
        id: "community-fees",
        name: "Comunidad",
        slug: "community_fees"
      }),
      createCategory({
        id: "savings-transfer",
        name: "Ahorro",
        slug: "savings_transfer"
      }),
      createCategory({
        id: "internet-mobile",
        name: "Internet y móvil",
        slug: "internet_mobile"
      }),
      createCategory({
        id: "home-insurance",
        name: "Seguro de hogar",
        slug: "home_insurance"
      }),
      createCategory({
        id: "mortgage",
        name: "Hipoteca",
        slug: "mortgage"
      })
    ];
    const summary = buildMonthlyCategoryExpensesSummary({
      periodStart: "2026-07-01",
      transactions: [
        createTransaction({ id: "uncategorized-expense", amount: "-10" }),
        createTransaction({ id: "uncategorized-income", amount: "10" }),
        createTransaction({
          id: "outgoing-transfer",
          amount: "-50",
          cashflow_type: "internal_transfer"
        }),
        createTransaction({
          id: "incoming-transfer",
          amount: "50",
          cashflow_type: "internal_transfer"
        }),
        ...excludedCategories.map((category, index) =>
          createTransaction({
            id: `excluded-${index}`,
            amount: "-10",
            category
          })
        ),
        createTransaction({
          id: "excluded-mortgage-refund",
          amount: "100",
          category: excludedCategories.at(-1)
        })
      ]
    });

    expect(summary.points).toEqual([]);
    expect(summary.totalExpenses).toBe(0);
    expect(summary.transactionCount).toBe(0);
    expect(summary.uncategorizedExpenseCount).toBe(1);
    expect(summary.excludedInternalTransferCount).toBe(2);
    expect(summary.excludedCategoryNames).toEqual(
      excludedCategories
        .map((category) => category.name)
        .sort((left, right) => left.localeCompare(right))
    );
  });

  it("excludes manually categorized transfers before choosing the currency", () => {
    const summary = buildMonthlyCategoryExpensesSummary({
      periodStart: "2026-07-01",
      transactions: [
        createTransaction({
          id: "expense",
          amount: "-25",
          category: createCategory({
            id: "groceries",
            name: "Supermercado",
            slug: "groceries"
          })
        }),
        createTransaction({
          id: "first-transfer",
          amount: "-100",
          currency: "USD",
          category: createCategory({
            id: "internal-transfer",
            name: "Transferencia interna",
            slug: "internal_transfer"
          })
        }),
        createTransaction({
          id: "second-transfer",
          amount: "100",
          currency: "USD",
          category: createCategory({
            id: "internal-transfer",
            name: "Transferencia interna",
            slug: "internal_transfer"
          })
        }),
        createTransaction({
          id: "same-currency-transfer",
          amount: "-75",
          category: createCategory({
            id: "internal-transfer",
            name: "Transferencia interna",
            slug: "internal_transfer"
          })
        })
      ]
    });

    expect(summary.currency).toBe("EUR");
    expect(summary.points).toHaveLength(1);
    expect(summary.totalExpenses).toBe(25);
    expect(summary.transactionCount).toBe(1);
    expect(summary.excludedInternalTransferCount).toBe(1);
  });
});

function createTransaction(
  overrides: Partial<MonthlyTransactionSummary> = {}
): MonthlyTransactionSummary {
  return {
    id: "transaction",
    institution_slug: "ing",
    institution_name: "ING",
    institution_provider_id: "ES:ING",
    account_id: "account",
    account_name: "Cuenta",
    account_iban_last4: "1234",
    booking_status: "booked",
    booking_date: "2026-07-15",
    reporting_date: "2026-07-15",
    cashflow_type: "external",
    amount: "-10",
    currency: "EUR",
    description: "Movimiento",
    merchant_name: null,
    counterparty_name: null,
    category: null,
    labels: [],
    ...overrides
  };
}

function createCategory({
  id,
  name,
  slug
}: {
  id: string;
  name: string;
  slug: string;
}): MonthlyTransactionCategory {
  return {
    id,
    name,
    slug,
    group: {
      id: "leisure",
      name: "Ocio"
    }
  };
}
