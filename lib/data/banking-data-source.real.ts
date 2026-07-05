import "server-only";

import { isEmailAllowed } from "@/lib/auth/allowlist";
import { listUserEnableBankingConnections } from "@/lib/db/enable-banking-connections";
import {
  getEnableBankingApplication,
  getEnableBankingAspsps
} from "@/lib/enable-banking/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AppUser,
  BankingDataSource,
  InstitutionAvailability,
  ProviderApplication
} from "@/lib/data/banking-data-source";

const INITIAL_BANK_NAMES = ["CaixaBank", "ING"];

export const realBankingDataSource: BankingDataSource = {
  mode: "real",
  async getCurrentUser() {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? null,
      isAllowed: isEmailAllowed(user.email)
    } satisfies AppUser;
  },
  async getProviderApplication() {
    const application = await getEnableBankingApplication();

    return {
      name: application.name,
      kid: application.kid,
      environment: application.environment,
      active: application.active,
      countries: application.countries,
      services: application.services
    } satisfies ProviderApplication;
  },
  async listAvailableInstitutions() {
    const aspsps = await getEnableBankingAspsps({
      country: "ES",
      psuType: "personal",
      service: "AIS"
    });

    return aspsps
      .filter((aspsp) =>
        INITIAL_BANK_NAMES.some((bankName) =>
          aspsp.name.toLowerCase().includes(bankName.toLowerCase())
        )
      )
      .map((aspsp): InstitutionAvailability => ({
        name: aspsp.name,
        country: aspsp.country,
        logo: aspsp.logo,
        beta: aspsp.beta,
        maximumConsentValidity: aspsp.maximum_consent_validity
      }));
  },
  async listBankConnections(userId: string) {
    return listUserEnableBankingConnections(userId);
  }
};
