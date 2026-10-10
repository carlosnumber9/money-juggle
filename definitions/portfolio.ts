export type PortfolioPosition = {
  name: string;
  isin: string;
  quantity: string;
  price: string;
  priceDate: string;
  value: string;
};

export type PortfolioValues = {
  reportDate: string;
  currency: "EUR";
  cash: string;
  positions: PortfolioPosition[];
};

export type PortfolioExtraction = PortfolioValues & {
  reportedInvestments: string;
  reportedTotal: string;
};

export type PortfolioSnapshotSummary = {
  id: string;
  reportDate: string;
  currency: "EUR";
  cash: string;
  investments: string;
  revision: string;
};

export type PortfolioSnapshot = PortfolioSnapshotSummary & {
  positions: PortfolioPosition[];
};

export type PortfolioImportDraft = {
  id: string;
  expiresAt: string;
  original: PortfolioExtraction;
};

export type PortfolioImportReview = {
  draft: PortfolioImportDraft;
  existing: PortfolioSnapshotSummary | null;
};

export type PortfolioImportState = {
  error: string | null;
  existing?: PortfolioSnapshotSummary | null;
};
