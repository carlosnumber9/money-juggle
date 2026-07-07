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
