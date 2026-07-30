export type MonthlyEvolutionPoint = {
  month: number;
  monthLabel: string;
  income: number;
  expenses: number;
};

export type MonthlyEvolutionSummary = {
  year: number;
  currency: string;
  points: MonthlyEvolutionPoint[];
  transactionCount: number;
};

export type MonthlyCategoryExpensePoint = {
  categoryId: string;
  categoryName: string;
  categoryGroupName: string;
  expenses: number;
  transactionCount: number;
};

export type MonthlyCategoryExpensesSummary = {
  monthLabel: string;
  currency: string;
  points: MonthlyCategoryExpensePoint[];
  totalExpenses: number;
  transactionCount: number;
  uncategorizedExpenseCount: number;
  excludedCategoryNames: string[];
};

export type AnnualLabelExpensePoint = {
  labelId: string;
  labelName: string;
  expenses: number;
  transactionCount: number;
};

export type AnnualLabelExpensesSummary = {
  year: number;
  currency: string;
  points: AnnualLabelExpensePoint[];
  totalExpenses: number;
  transactionCount: number;
};
