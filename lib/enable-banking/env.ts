import "server-only";

import { readFileSync } from "node:fs";

type EnableBankingConfig = {
  apiBaseUrl: string;
  applicationId: string;
  privateKey: string;
};

const DEFAULT_API_BASE_URL = "https://api.enablebanking.com";

export function getEnableBankingConfig(): EnableBankingConfig {
  const applicationId = process.env.ENABLE_BANKING_APPLICATION_ID;
  const privateKey = getPrivateKey();

  if (!applicationId) {
    throw new Error("Missing ENABLE_BANKING_APPLICATION_ID.");
  }

  if (!privateKey) {
    throw new Error(
      "Missing ENABLE_BANKING_PRIVATE_KEY or ENABLE_BANKING_PRIVATE_KEY_PATH."
    );
  }

  return {
    apiBaseUrl: process.env.ENABLE_BANKING_API_BASE_URL ?? DEFAULT_API_BASE_URL,
    applicationId,
    privateKey
  };
}

function getPrivateKey(): string | undefined {
  const privateKey = process.env.ENABLE_BANKING_PRIVATE_KEY;

  if (privateKey) {
    return normalizePem(privateKey);
  }

  const privateKeyPath = process.env.ENABLE_BANKING_PRIVATE_KEY_PATH;

  if (privateKeyPath) {
    return readFileSync(privateKeyPath, "utf8");
  }

  return undefined;
}

function normalizePem(value: string): string {
  return value.replaceAll("\\n", "\n");
}
