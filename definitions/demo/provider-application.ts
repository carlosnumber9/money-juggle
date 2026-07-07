import type { ProviderApplication } from "../data-source";

export const DEMO_PROVIDER_APPLICATION: ProviderApplication = {
  name: "money-juggle demo",
  kid: "demo-local-key",
  environment: "demo",
  active: true,
  countries: ["ES"],
  services: ["AIS"]
};
