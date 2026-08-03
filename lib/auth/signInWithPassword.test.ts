import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAuthLogId: vi.fn(() => "auth-log-id"),
  createSupabaseServerClient: vi.fn(),
  hasAllowedEmails: vi.fn(),
  isDemoMode: vi.fn(),
  isEmailAllowed: vi.fn(),
  logAuthEvent: vi.fn(),
  maskEmail: vi.fn(() => "ow***@example.com"),
  normalizeEmail: vi.fn((email: string) => email.trim().toLowerCase()),
  redirect: vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  revalidatePath: vi.fn(),
  sanitizeAuthError: vi.fn((error: unknown) => error),
  signInWithPassword: vi.fn(),
  signOut: vi.fn()
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath
}));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));
vi.mock("@/lib/auth/allowlist", () => ({
  hasAllowedEmails: mocks.hasAllowedEmails,
  isEmailAllowed: mocks.isEmailAllowed,
  normalizeEmail: mocks.normalizeEmail
}));
vi.mock("@/lib/auth/authLogging", () => ({
  createAuthLogId: mocks.createAuthLogId,
  logAuthEvent: mocks.logAuthEvent,
  maskEmail: mocks.maskEmail,
  sanitizeAuthError: mocks.sanitizeAuthError
}));
vi.mock("@/lib/demo/mode", () => ({
  isDemoMode: mocks.isDemoMode
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));

import { signInWithPassword } from "@/lib/auth/signInWithPassword";

describe("signInWithPassword", () => {
  beforeEach(() => {
    mocks.isDemoMode.mockReturnValue(false);
    mocks.hasAllowedEmails.mockReturnValue(true);
    mocks.isEmailAllowed.mockReturnValue(true);
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.signInWithPassword.mockResolvedValue({
      data: {
        user: { email: "owner@example.com" },
        session: { user: { email: "owner@example.com" } }
      },
      error: null
    });
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        signInWithPassword: mocks.signInWithPassword,
        signOut: mocks.signOut
      }
    });
  });

  it("rejects a missing email before contacting Supabase", async () => {
    await expect(signInWithPassword(createForm("", "secret"))).rejects.toThrow(
      "NEXT_REDIRECT:/login?status=missing-email"
    );

    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("rejects a missing password before contacting Supabase", async () => {
    await expect(
      signInWithPassword(createForm("owner@example.com", ""))
    ).rejects.toThrow("NEXT_REDIRECT:/login?status=missing-password");

    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("rejects login when the allowlist is missing", async () => {
    mocks.hasAllowedEmails.mockReturnValue(false);

    await expect(
      signInWithPassword(createForm("owner@example.com", "secret"))
    ).rejects.toThrow("NEXT_REDIRECT:/login?status=allowlist-missing");

    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("rejects an email outside the allowlist before authentication", async () => {
    mocks.isEmailAllowed.mockReturnValue(false);

    await expect(
      signInWithPassword(createForm("other@example.com", "secret"))
    ).rejects.toThrow("NEXT_REDIRECT:/login?status=not-allowed");

    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("uses a generic status for invalid credentials without logging the password", async () => {
    const password = "never-log-this-password";
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        code: "invalid_credentials",
        message: "Invalid login credentials",
        status: 400
      }
    });

    await expect(
      signInWithPassword(createForm("OWNER@example.com", password))
    ).rejects.toThrow("NEXT_REDIRECT:/login?status=invalid-credentials");

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "owner@example.com",
      password
    });
    expect(JSON.stringify(mocks.logAuthEvent.mock.calls)).not.toContain(
      password
    );
    expect(JSON.stringify(mocks.logAuthEvent.mock.calls)).not.toContain(
      "owner@example.com"
    );
  });

  it("uses a specific status for a Supabase rate limit", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        code: "over_request_rate_limit",
        message: "Rate limit exceeded for owner@example.com",
        status: 429
      }
    });

    await expect(
      signInWithPassword(createForm("owner@example.com", "secret"))
    ).rejects.toThrow("NEXT_REDIRECT:/login?status=login-rate-limit");

    expect(JSON.stringify(mocks.logAuthEvent.mock.calls)).not.toContain(
      "owner@example.com"
    );
  });

  it("signs out a successfully authenticated user outside the allowlist", async () => {
    mocks.isEmailAllowed.mockReturnValueOnce(true).mockReturnValueOnce(false);
    mocks.signInWithPassword.mockResolvedValue({
      data: {
        user: { email: "other@example.com" },
        session: { user: { email: "other@example.com" } }
      },
      error: null
    });

    await expect(
      signInWithPassword(createForm("owner@example.com", "secret"))
    ).rejects.toThrow("NEXT_REDIRECT:/login?status=not-allowed");

    expect(mocks.signOut).toHaveBeenCalledOnce();
  });

  it("creates the session and redirects an allowed authenticated user", async () => {
    await expect(
      signInWithPassword(createForm(" OWNER@example.com ", "secret"))
    ).rejects.toThrow("NEXT_REDIRECT:/");

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "secret"
    });
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

function createForm(email: string, password: string) {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("password", password);
  return formData;
}
