export type MonthlyCashflowTotal = {
  amount: string;
  currency: string;
  transactionCount: number;
};

export type MonthlyCashflowBucket = {
  totals: MonthlyCashflowTotal[];
  transactionCount: number;
  excludedInternalTransferCount: number;
};

export type MonthlyCashflowSummary = {
  income: MonthlyCashflowBucket;
  expenses: MonthlyCashflowBucket;
};
