import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  return signOut(request);
}

export async function POST(request: NextRequest) {
  return signOut(request);
}

async function signOut(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const status =
    requestUrl.searchParams.get("status") === "not-allowed"
      ? "not-allowed"
      : "signed-out";

  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(
    new URL(`/login?status=${status}`, request.url),
    {
      status: 303
    }
  );
}
