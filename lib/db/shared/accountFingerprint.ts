import "server-only";

import { createHmac } from "node:crypto";

export function getAccountFingerprint(
  value: string | null | undefined
): string | null {
  const normalized = normalizeAccountIdentifier(value);
  const secret = process.env.MONEY_JUGGLE_ACCOUNT_FINGERPRINT_SECRET;

  if (!normalized || !secret) {
    return null;
  }

  return createHmac("sha256", secret).update(normalized).digest("hex");
}

export function normalizeAccountIdentifier(
  value: string | null | undefined
): string | null {
  const normalized = value?.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  return normalized && normalized.length >= 4 ? normalized : null;
}
