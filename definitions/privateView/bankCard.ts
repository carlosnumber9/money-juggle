export type BankInstitutionCard = {
  slug: "caixabank" | "ing" | "trade-republic";
  name: string;
  logoPath: string;
  provider: "enable_banking" | "manual";
  aspspName?: string;
  country?: string;
  state:
    | "loading"
    | "idle"
    | "connected"
    | "linking"
    | "stale-linking"
    | "error"
    | "unavailable";
  tooltip: string;
  balanceTotals?: Array<{
    amount: string;
    currency: string;
    fetchedAt: string | null;
  }>;
  accounts?: Array<{
    id: string;
    name: string;
    ibanLast4: string | null;
    accountType: string | null;
    latestBalance: {
      amount: string;
      currency: string;
      balanceType: string;
      referenceDate: string | null;
      fetchedAt: string;
    } | null;
  }>;
};

export const BANKS = [
  {
    slug: "caixabank",
    name: "CaixaBank",
    logoPath: "/assets/institutions/caixabank.svg",
    provider: "enable_banking"
  },
  {
    slug: "ing",
    name: "ING",
    logoPath: "/assets/institutions/ing.svg",
    provider: "enable_banking"
  },
  {
    slug: "trade-republic",
    name: "Trade Republic",
    logoPath: "/assets/institutions/trade-republic.svg",
    provider: "manual"
  }
] as const;
