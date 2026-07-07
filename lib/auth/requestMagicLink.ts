"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { hasAllowedEmails, isEmailAllowed } from "@/lib/auth/allowlist";
import {
  createAuthLogId,
  logAuthEvent,
  maskEmail,
  sanitizeAuthError
} from "@/lib/auth/authLogging";
import { isDemoMode } from "@/lib/demo/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestOrigin } from "@/lib/url/requestOrigin";

export async function requestMagicLink(formData: FormData) {
  const authLogId = createAuthLogId();

  if (isDemoMode()) {
    logAuthEvent("info", "Magic link request skipped in demo mode.", {
      authLogId
    });
    redirect("/");
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    logAuthEvent("warn", "Magic link request rejected: missing email.", {
      authLogId
    });
    redirect("/login?status=missing-email");
  }

  if (!hasAllowedEmails()) {
    logAuthEvent("error", "Magic link request rejected: allowlist missing.", {
      authLogId
    });
    redirect("/login?status=allowlist-missing");
  }

  if (!isEmailAllowed(email)) {
    logAuthEvent("warn", "Magic link request rejected: email not allowed.", {
      authLogId,
      email: maskEmail(email)
    });
    redirect("/login?status=not-allowed");
  }

  const headerStore = await headers();
  const origin = getRequestOrigin(headerStore);
  const supabase = await createSupabaseServerClient();
  const emailRedirectTo = `${origin}/auth/callback`;

  logAuthEvent("info", "Magic link request started.", {
    authLogId,
    email: maskEmail(email),
    origin,
    emailRedirectTo
  });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: false
    }
  });

  if (error) {
    logAuthEvent("error", "Magic link request failed.", {
      authLogId,
      email: maskEmail(email),
      origin,
      emailRedirectTo,
      error: sanitizeAuthError(error)
    });

    if (isEmailRateLimitError(error)) {
      redirect("/login?status=email-rate-limit");
    }

    redirect("/login?status=error");
  }

  logAuthEvent("info", "Magic link request succeeded.", {
    authLogId,
    email: maskEmail(email),
    origin,
    emailRedirectTo
  });

  redirect(`/login?status=sent&email=${encodeURIComponent(email)}`);
}

function isEmailRateLimitError(error: { message: string; status?: number }) {
  const message = error.message.toLowerCase();

  return (
    error.status === 429 ||
    message.includes("rate limit") ||
    message.includes("email rate") ||
    message.includes("smtp")
  );
}
