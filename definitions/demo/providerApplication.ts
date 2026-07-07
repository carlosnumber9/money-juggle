import type { ProviderApplication } from "../dataSource";

export const DEMO_PROVIDER_APPLICATION: ProviderApplication = {
  name: "money-juggle demo",
  kid: "demo-local-key",
  environment: "demo",
  active: true,
  countries: ["ES"],
  services: ["AIS"]
};
