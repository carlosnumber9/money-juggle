import "server-only";

export function isDemoMode(): boolean {
  return (
    process.env.MONEY_JUGGLE_DEMO_MODE === "true" &&
    process.env.NODE_ENV === "development" &&
    !process.env.VERCEL
  );
}
