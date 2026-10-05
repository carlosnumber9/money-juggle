export type CategoryTreatment =
  | "income"
  | "expense"
  | "uncategorized"
  | "internal_transfer"
  | "savings"
  | "investment"
  | "cash";

export type ReportCategoryRow = {
  account: string;
  category: string;
  subcategory: string;
  currency: string;
  treatment: CategoryTreatment;
  income: string | null;
  expenses: string | null;
  net: string;
  observations: string;
};

export type ReportAccountRow = {
  account: string;
  institution: string;
  currency: string;
  firstBalance: string | null;
  firstDate: string | null;
  firstDateSource: "bank" | "capture" | null;
  lastBalance: string | null;
  lastDate: string | null;
  lastDateSource: "bank" | "capture" | null;
  variation: string | null;
  inflows: string;
  outflows: string;
  reconciliationDifference: string | null;
  lastSync: string | null;
  observations: string;
};

export type MonthlyExportReport = {
  month: string;
  generatedAt: Date;
  provisional: boolean;
  totals: Array<{
    currency: string;
    income: string;
    expenses: string;
    surplus: string;
    uncategorized: string;
    neutral: string;
  }>;
  categories: ReportCategoryRow[];
  accounts: ReportAccountRow[];
  observations: string[];
};
