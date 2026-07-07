import type { InstitutionAvailability } from "../dataSource";

export const DEMO_INSTITUTIONS: InstitutionAvailability[] = [
  {
    name: "CaixaBank",
    country: "ES",
    logo: "/assets/institutions/caixabank.svg",
    beta: false,
    maximumConsentValidity: 180 * 24 * 60 * 60
  },
  {
    name: "ING",
    country: "ES",
    logo: "/assets/institutions/ing.svg",
    beta: false,
    maximumConsentValidity: 180 * 24 * 60 * 60
  }
];
