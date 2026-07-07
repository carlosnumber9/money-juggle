"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { hasAllowedEmails, isEmailAllowed } from "@/lib/auth/allowlist";
import { isDemoMode } from "@/lib/demo/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestOrigin } from "@/lib/url/requestOrigin";

export async function requestMagicLink(formData: FormData) {
  if (isDemoMode()) {
    redirect("/");
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    redirect("/login?status=missing-email");
  }

  if (!hasAllowedEmails()) {
    redirect("/login?status=allowlist-missing");
  }

  if (!isEmailAllowed(email)) {
    redirect("/login?status=not-allowed");
  }

  const headerStore = await headers();
  const origin = getRequestOrigin(headerStore);
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: false
    }
  });

  if (error) {
    if (isEmailRateLimitError(error)) {
      redirect("/login?status=email-rate-limit");
    }

    redirect("/login?status=error");
  }

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
