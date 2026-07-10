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
  excludedInternalTransferCount: number;
};
