import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { logAuthEvent, sanitizeAuthError } from "@/lib/auth/authLogging";
import { getSupabaseConfig } from "@/lib/supabase/env";

export async function createSupabaseServerClient() {
  const { url, publishableKey } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        const diagnostics = getSupabaseCookieWriteDiagnostics(cookiesToSet);

        if (diagnostics.hasSupabaseAuthCookie) {
          logAuthEvent("info", "Supabase auth cookies scheduled for write.", {
            ...diagnostics
          });
        }

        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          logAuthEvent("warn", "Supabase cookie write skipped by Next.js.", {
            ...diagnostics,
            error: sanitizeAuthError(error)
          });
          // Server Components cannot always write cookies; Server Actions and
          // the Proxy handle writes in response-capable contexts.
        }
      }
    }
  });
}

function getSupabaseCookieWriteDiagnostics(cookiesToSet: { name: string }[]) {
  const cookieNames = cookiesToSet.map((cookie) => cookie.name);

  return {
    cookieCount: cookieNames.length,
    hasSupabaseAuthCookie: cookieNames.some(
      (name) => name.startsWith("sb-") && name.includes("auth-token")
    )
  };
}
