export const ENABLE_BANKING_RATE_LIMIT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export function getActiveRateLimitCooldown(
  value: string | null,
  now = new Date()
): string | null {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) || timestamp <= now.getTime() ? null : value;
}
