"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  hasAllowedEmails,
  isEmailAllowed,
  normalizeEmail
} from "@/lib/auth/allowlist";
import {
  createAuthLogId,
  logAuthEvent,
  maskEmail,
  sanitizeAuthError
} from "@/lib/auth/authLogging";
import { isDemoMode } from "@/lib/demo/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signInWithPassword(formData: FormData) {
  const authLogId = createAuthLogId();

  if (isDemoMode()) {
    logAuthEvent("info", "Password sign-in skipped in demo mode.", {
      authLogId
    });
    redirect("/");
  }

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!email) {
    logAuthEvent("warn", "Password sign-in rejected: missing email.", {
      authLogId
    });
    redirect("/login?status=missing-email");
  }

  if (!password) {
    logAuthEvent("warn", "Password sign-in rejected: missing password.", {
      authLogId,
      email: maskEmail(email)
    });
    redirect("/login?status=missing-password");
  }

  if (!hasAllowedEmails()) {
    logAuthEvent("error", "Password sign-in rejected: allowlist missing.", {
      authLogId
    });
    redirect("/login?status=allowlist-missing");
  }

  if (!isEmailAllowed(email)) {
    logAuthEvent("warn", "Password sign-in rejected: email not allowed.", {
      authLogId,
      email: maskEmail(email)
    });
    redirect("/login?status=not-allowed");
  }

  const supabase = await createSupabaseServerClient();

  logAuthEvent("info", "Password sign-in started.", {
    authLogId,
    email: maskEmail(email)
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    logAuthEvent("warn", "Password sign-in failed.", {
      authLogId,
      email: maskEmail(email),
      error: sanitizePasswordSignInError(error)
    });
    redirect(
      `/login?status=${isRateLimitError(error) ? "login-rate-limit" : "invalid-credentials"}`
    );
  }

  const authenticatedEmail = data.user?.email ?? data.session?.user.email;

  if (!isEmailAllowed(authenticatedEmail)) {
    logAuthEvent(
      "warn",
      "Password sign-in rejected after authentication: email not allowed.",
      {
        authLogId,
        email: authenticatedEmail ? maskEmail(authenticatedEmail) : null
      }
    );

    await supabase.auth.signOut();
    redirect("/login?status=not-allowed");
  }

  logAuthEvent("info", "Password sign-in succeeded.", {
    authLogId,
    email: authenticatedEmail ? maskEmail(authenticatedEmail) : null
  });

  revalidatePath("/", "layout");
  redirect("/");
}

function isRateLimitError(error: { message: string; status?: number }) {
  return (
    error.status === 429 || error.message.toLowerCase().includes("rate limit")
  );
}

function sanitizePasswordSignInError(error: unknown) {
  const sanitizedError = sanitizeAuthError(error);

  return {
    name: sanitizedError.name,
    status: sanitizedError.status,
    code: sanitizedError.code
  };
}
