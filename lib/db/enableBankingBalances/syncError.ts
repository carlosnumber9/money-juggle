export class BalanceSyncUnavailableError extends Error {
  constructor(readonly rateLimited: boolean) {
    super("Could not fetch balances for any linked account.");
    this.name = "BalanceSyncUnavailableError";
  }
}
