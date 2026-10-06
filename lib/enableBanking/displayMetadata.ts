import "server-only";

import { unstable_cache } from "next/cache";
import {
  INITIAL_BANK_NAMES,
  type InstitutionAvailability,
  type ProviderApplication
} from "@/definitions";
import { getEnableBankingApplication, getEnableBankingAspsps } from "./client";
import { getEnableBankingConfig } from "./env";

export const DISPLAY_METADATA_TTL_SECONDS = 300;

function displayCacheKey(resource: string, filters: string[] = []): string[] {
  // Credentials are deliberately excluded from the cache identity and value.
  const { apiBaseUrl, applicationId } = getEnableBankingConfig();
  return [
    "enable-banking-display-v1",
    process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    apiBaseUrl,
    applicationId,
    resource,
    ...filters
  ];
}

export async function getCachedProviderApplication(): Promise<ProviderApplication> {
  return unstable_cache(
    async () => {
      const application = await getEnableBankingApplication();
      return {
        name: application.name,
        kid: application.kid,
        environment: application.environment,
        active: application.active,
        countries: application.countries,
        services: application.services,
        checkedAt: new Date().toISOString()
      };
    },
    displayCacheKey("application"),
    { revalidate: DISPLAY_METADATA_TTL_SECONDS }
  )();
}

export async function getCachedAvailableInstitutions({
  country = "ES",
  psuType = "personal",
  service = "AIS"
}: {
  country?: string;
  psuType?: "personal" | "business";
  service?: "AIS";
} = {}): Promise<InstitutionAvailability[]> {
  return unstable_cache(
    async () => {
      const institutions = await getEnableBankingAspsps({
        country,
        psuType,
        service
      });
      return institutions
        .filter((institution) =>
          INITIAL_BANK_NAMES.some((name) =>
            institution.name.toLowerCase().includes(name.toLowerCase())
          )
        )
        .map((institution) => ({
          name: institution.name,
          country: institution.country,
          logo: institution.logo,
          beta: institution.beta,
          maximumConsentValidity: institution.maximum_consent_validity
        }));
    },
    displayCacheKey("institutions", [country, psuType, service]),
    { revalidate: DISPLAY_METADATA_TTL_SECONDS }
  )();
}
