export type ProviderStatusView =
  | {
      status: "success";
      applicationName: string;
      checkedAt?: string;
    }
  | {
      status: "error";
      reason: string;
    };
