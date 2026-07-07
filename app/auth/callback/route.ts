import { type NextRequest, NextResponse } from "next/server";

import { isEmailAllowed } from "@/lib/auth/allowlist";
import {
  createAuthLogId,
  logAuthEvent,
  maskEmail,
  sanitizeAuthError
} from "@/lib/auth/authLogging";
import { isDemoMode } from "@/lib/demo/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const authLogId = createAuthLogId();
  const requestUrl = new URL(request.url);

  if (isDemoMode()) {
    logAuthEvent("info", "Auth callback skipped in demo mode.", {
      authLogId,
      origin: requestUrl.origin
    });
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

  const code = requestUrl.searchParams.get("code");
  const cookieDiagnostics = getCookieDiagnostics(request);

  logAuthEvent("info", "Auth callback received.", {
    authLogId,
    origin: requestUrl.origin,
    hasCode: Boolean(code),
    ...cookieDiagnostics
  });

  if (!code) {
    logAuthEvent("warn", "Auth callback rejected: missing code.", {
      authLogId,
      origin: requestUrl.origin,
      ...cookieDiagnostics
    });
    return redirectToLogin(requestUrl, "callback-error");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logAuthEvent("error", "Auth callback code exchange failed.", {
      authLogId,
      origin: requestUrl.origin,
      ...cookieDiagnostics,
      error: sanitizeAuthError(error)
    });

    return redirectToLogin(requestUrl, "callback-error");
  }

  const email = data.user?.email ?? data.session?.user.email;

  if (!isEmailAllowed(email)) {
    logAuthEvent("warn", "Auth callback rejected: email not allowed.", {
      authLogId,
      origin: requestUrl.origin,
      email: email ? maskEmail(email) : null
    });

    await supabase.auth.signOut();

    return redirectToLogin(requestUrl, "not-allowed");
  }

  logAuthEvent("info", "Auth callback succeeded.", {
    authLogId,
    origin: requestUrl.origin,
    email: email ? maskEmail(email) : null
  });

  return NextResponse.redirect(new URL("/", requestUrl.origin));
}

function redirectToLogin(requestUrl: URL, status: string) {
  return NextResponse.redirect(
    new URL(`/login?status=${encodeURIComponent(status)}`, requestUrl.origin)
  );
}

function getCookieDiagnostics(request: NextRequest) {
  const cookieNames = request.cookies.getAll().map((cookie) => cookie.name);

  return {
    cookieCount: cookieNames.length,
    hasSupabaseAuthCookie: cookieNames.some(
      (name) => name.startsWith("sb-") && name.includes("auth-token")
    ),
    hasSupabaseCodeVerifierCookie: cookieNames.some((name) =>
      name.includes("code-verifier")
    )
  };
}
