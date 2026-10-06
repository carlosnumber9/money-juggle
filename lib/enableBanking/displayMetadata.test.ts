import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  application: vi.fn(),
  institutions: vi.fn(),
  config: vi.fn(),
  registrations: [] as Array<{ key: string[]; revalidate: number }>,
  cache: new Map<string, { expires: number; value: unknown }>()
}));
vi.mock("next/cache", () => ({
  unstable_cache: (
    read: () => Promise<unknown>,
    key: string[],
    options: { revalidate: number }
  ) => {
    mocks.registrations.push({ key, revalidate: options.revalidate });
    return async () => {
      const cacheKey = JSON.stringify(key);
      const cached = mocks.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) return cached.value;
      const value = await read();
      mocks.cache.set(cacheKey, {
        expires: Date.now() + options.revalidate * 1000,
        value
      });
      return value;
    };
  }
}));
vi.mock("./client", () => ({
  getEnableBankingApplication: mocks.application,
  getEnableBankingAspsps: mocks.institutions
}));
vi.mock("./env", () => ({ getEnableBankingConfig: mocks.config }));
import {
  getCachedAvailableInstitutions,
  getCachedProviderApplication
} from "./displayMetadata";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-06T10:00:00Z"));
  vi.resetAllMocks();
  mocks.cache.clear();
  mocks.registrations.length = 0;
  mocks.config.mockReturnValue({
    apiBaseUrl: "https://sandbox.example",
    applicationId: "app-one",
    privateKey: "secret-signing-key"
  });
  mocks.application.mockResolvedValue({
    name: "App",
    kid: "app-one",
    environment: "SANDBOX",
    active: true,
    countries: ["ES"],
    services: ["AIS"],
    token: "secret-token",
    redirect_urls: ["private-url"]
  });
  mocks.institutions.mockResolvedValue([
    { name: "CaixaBank", country: "ES", logo: "logo", secret: "private-field" },
    { name: "Unrelated Bank", country: "ES" }
  ]);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
describe("provider display cache boundary", () => {
  it("reuses successful normalized data for five minutes and preserves its check time", async () => {
    const first = await getCachedProviderApplication();
    vi.advanceTimersByTime(299_000);
    expect(await getCachedProviderApplication()).toEqual(first);
    expect(mocks.application).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1001);
    const next = await getCachedProviderApplication();
    expect(next.checkedAt).not.toBe(first.checkedAt);
    expect(mocks.application).toHaveBeenCalledTimes(2);
    expect(mocks.registrations.every((entry) => entry.revalidate === 300)).toBe(
      true
    );
    expect(JSON.stringify([...mocks.cache.entries()])).not.toMatch(
      /secret|private-url/
    );
  });
  it("does not turn failures into a cached success", async () => {
    mocks.application.mockRejectedValueOnce(new Error("Unavailable"));
    await expect(getCachedProviderApplication()).rejects.toThrow("Unavailable");
    expect(mocks.cache.size).toBe(0);
    await getCachedProviderApplication();
    expect(mocks.application).toHaveBeenCalledTimes(2);
  });
  it("separates environments, applications, API endpoints and catalog filters", async () => {
    await getCachedAvailableInstitutions();
    await getCachedAvailableInstitutions();
    expect(mocks.institutions).toHaveBeenCalledOnce();
    await getCachedAvailableInstitutions({ country: "FR" });
    await getCachedAvailableInstitutions({ psuType: "business" });
    vi.stubEnv("VERCEL_ENV", "preview");
    await getCachedAvailableInstitutions();
    mocks.config.mockReturnValue({
      apiBaseUrl: "https://production.example",
      applicationId: "app-two",
      privateKey: "secret-two"
    });
    await getCachedAvailableInstitutions();
    expect(mocks.institutions).toHaveBeenCalledTimes(5);
    expect(mocks.registrations[0].key).toContain("app-one");
    expect(mocks.registrations.at(-1)?.key).toContain("app-two");
    expect(JSON.stringify(mocks.registrations)).not.toContain("secret");
    expect(await getCachedAvailableInstitutions()).toEqual([
      { name: "CaixaBank", country: "ES", logo: "logo" }
    ]);
  });
});
