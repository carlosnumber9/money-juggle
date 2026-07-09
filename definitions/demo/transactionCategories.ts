import type { TransactionCategoryGroupSummary } from "../dataSource";

export const DEMO_TRANSACTION_CATEGORY_GROUPS: TransactionCategoryGroupSummary[] =
  [
    {
      id: "50000000-0000-4000-8000-000000000001",
      name: "Ingresos",
      slug: "income",
      categories: [
        {
          id: "51000000-0000-4000-8000-000000000001",
          name: "Nómina",
          slug: "salary"
        },
        {
          id: "51000000-0000-4000-8000-000000000002",
          name: "Ingresos freelance",
          slug: "freelance_income"
        }
      ]
    },
    {
      id: "50000000-0000-4000-8000-000000000002",
      name: "Compra y hogar",
      slug: "groceries_household",
      categories: [
        {
          id: "51000000-0000-4000-8000-000000000003",
          name: "Supermercado",
          slug: "groceries"
        }
      ]
    },
    {
      id: "50000000-0000-4000-8000-000000000003",
      name: "Restauración",
      slug: "food_drink",
      categories: [
        {
          id: "51000000-0000-4000-8000-000000000004",
          name: "Restaurantes y bares",
          slug: "restaurants_bars"
        },
        {
          id: "51000000-0000-4000-8000-000000000005",
          name: "Comida a domicilio",
          slug: "takeaway_delivery"
        }
      ]
    }
  ];
