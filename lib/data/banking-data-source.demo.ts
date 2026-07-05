import "server-only";

import {
  type BankingDataSource,
  DEMO_BANK_CONNECTIONS,
  DEMO_INSTITUTIONS,
  DEMO_PROVIDER_APPLICATION,
  DEMO_USER
} from "@/definitions";

export const demoBankingDataSource: BankingDataSource = {
  mode: "demo",
  async getCurrentUser() {
    return DEMO_USER;
  },
  async getProviderApplication() {
    return DEMO_PROVIDER_APPLICATION;
  },
  async listAvailableInstitutions() {
    return DEMO_INSTITUTIONS;
  },
  async listBankConnections() {
    return DEMO_BANK_CONNECTIONS;
  }
};
