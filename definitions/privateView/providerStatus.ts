export type ProviderStatusView =
  | {
      status: "success";
      applicationName: string;
    }
  | {
      status: "error";
      reason: string;
    };
