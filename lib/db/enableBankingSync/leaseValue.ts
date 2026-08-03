export const ENABLE_BANKING_SYNC_LEASE_MS = 10 * 60 * 1000;

export function getSyncLeaseUntil(now = new Date()): string {
  return new Date(now.getTime() + ENABLE_BANKING_SYNC_LEASE_MS).toISOString();
}
