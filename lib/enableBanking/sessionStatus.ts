export function getInvalidSessionState(
  providerError: string | undefined
): "expired" | "revoked" | null {
  switch (providerError) {
    case "EXPIRED_SESSION":
    case "CLOSED_SESSION":
      return "expired";
    case "REVOKED_SESSION":
      return "revoked";
    default:
      return null;
  }
}

export function hasExpiredConsent(
  expiresAt: string | null | undefined,
  now = new Date()
): boolean {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= now.getTime());
}
