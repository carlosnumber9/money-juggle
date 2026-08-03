import "server-only";

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { isDemoMode } from "@/lib/demo/mode";
import { getSupabaseConfig } from "@/lib/supabase/env";

export async function updateSupabaseSession(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.next();
  }

  const { url, publishableKey } = getSupabaseConfig();
  let response = createPassThroughResponse(request);

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, responseHeaders) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = createPassThroughResponse(request);

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(responseHeaders).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      }
    }
  });

  await supabase.auth.getClaims();

  return response;
}

function createPassThroughResponse(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: request.headers
    }
  });
}
