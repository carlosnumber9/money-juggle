import { DEFAULT_CONSENT_SECONDS } from "@/definitions";

export function getConsentValidUntil(maximumConsentValidity: number): string {
  const seconds = Math.min(maximumConsentValidity, DEFAULT_CONSENT_SECONDS);

  return new Date(Date.now() + seconds * 1000).toISOString();
}
