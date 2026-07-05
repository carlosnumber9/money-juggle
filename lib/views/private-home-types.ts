export type BankInstitutionCard = {
  slug: "caixabank" | "ing" | "trade-republic";
  name: string;
  logoPath: string;
  provider: "enable_banking" | "manual";
  aspspName?: string;
  country?: string;
  state: "loading" | "idle" | "connected" | "linking" | "error" | "unavailable";
  tooltip: string;
};

export type ProviderStatusView =
  | {
      status: "success";
      applicationName: string;
      isDemo: boolean;
    }
  | {
      status: "error";
      reason: string;
      isDemo: boolean;
    };

export type PrivateHomeView =
  | {
      kind: "unauthenticated";
    }
  | {
      kind: "forbidden";
    }
  | {
      kind: "ready";
      user: {
        email: string | null;
      };
      providerStatus: ProviderStatusView;
      bankCards: BankInstitutionCard[];
    };
