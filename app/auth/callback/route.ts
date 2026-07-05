import { type NextRequest, NextResponse } from "next/server";

import { isEmailAllowed } from "@/lib/auth/allowlist";
import { isDemoMode } from "@/lib/demo/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  if (isDemoMode()) {
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return redirectToLogin(requestUrl, "callback-error");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectToLogin(requestUrl, "callback-error");
  }

  const email = data.user?.email ?? data.session?.user.email;

  if (!isEmailAllowed(email)) {
    await supabase.auth.signOut();

    return redirectToLogin(requestUrl, "not-allowed");
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin));
}

function redirectToLogin(requestUrl: URL, status: string) {
  return NextResponse.redirect(
    new URL(`/login?status=${encodeURIComponent(status)}`, requestUrl.origin)
  );
}
