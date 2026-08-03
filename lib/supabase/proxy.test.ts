import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type CookieToSet = {
  name: string;
  value: string;
  options: {
    httpOnly?: boolean;
    path?: string;
  };
};

type CookieAdapter = {
  getAll(): { name: string; value: string }[];
  setAll(cookies: CookieToSet[], headers: Record<string, string>): void;
};

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getClaims: vi.fn(),
  getSupabaseConfig: vi.fn(),
  isDemoMode: vi.fn(),
  observedCookies: [] as { name: string; value: string }[]
}));

vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient
}));
vi.mock("@/lib/demo/mode", () => ({
  isDemoMode: mocks.isDemoMode
}));
vi.mock("@/lib/supabase/env", () => ({
  getSupabaseConfig: mocks.getSupabaseConfig
}));

import { updateSupabaseSession } from "@/lib/supabase/proxy";

describe("updateSupabaseSession", () => {
  beforeEach(() => {
    mocks.isDemoMode.mockReturnValue(false);
    mocks.getSupabaseConfig.mockReturnValue({
      url: "https://project.supabase.co",
      publishableKey: "sb_publishable_test"
    });
    mocks.getClaims.mockReset();
    mocks.observedCookies.length = 0;
    mocks.createServerClient.mockImplementation(
      (_url: string, _key: string, options: { cookies: CookieAdapter }) => ({
        auth: {
          getClaims: async () => {
            mocks.observedCookies.push(...options.cookies.getAll());
            options.cookies.setAll(
              [
                {
                  name: "sb-project-auth-token",
                  value: "renewed-session",
                  options: { httpOnly: true, path: "/" }
                }
              ],
              {
                "Cache-Control":
                  "private, no-cache, no-store, must-revalidate, max-age=0",
                Expires: "0",
                Pragma: "no-cache"
              }
            );
            mocks.getClaims();
            return { data: { claims: { sub: "user-id" } }, error: null };
          }
        }
      })
    );
  });

  it("preserves request cookies and returns renewed auth cookies and headers", async () => {
    const request = new NextRequest("https://money-juggle.example/private", {
      headers: {
        cookie: "theme=dark; sb-project-auth-token=old-session"
      }
    });

    const response = await updateSupabaseSession(request);

    expect(mocks.observedCookies).toEqual(
      expect.arrayContaining([
        { name: "theme", value: "dark" },
        { name: "sb-project-auth-token", value: "old-session" }
      ])
    );
    expect(request.cookies.get("theme")?.value).toBe("dark");
    expect(request.cookies.get("sb-project-auth-token")?.value).toBe(
      "renewed-session"
    );
    expect(response.cookies.get("sb-project-auth-token")?.value).toBe(
      "renewed-session"
    );
    expect(response.headers.get("cache-control")).toBe(
      "private, no-cache, no-store, must-revalidate, max-age=0"
    );
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(mocks.getClaims).toHaveBeenCalledOnce();
  });

  it("does not contact Supabase in local demo mode", async () => {
    mocks.isDemoMode.mockReturnValue(true);

    const response = await updateSupabaseSession(
      new NextRequest("https://money-juggle.example/login")
    );

    expect(response.status).toBe(200);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
});
