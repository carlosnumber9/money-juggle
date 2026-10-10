import type { PortfolioSnapshot } from "../portfolio";
export type InvestmentsView = {
  latest: PortfolioSnapshot | null;
  points: Array<{
    date: string;
    timestamp: number;
    cash: number;
    investments: number;
  }>;
  error: string | null;
};
