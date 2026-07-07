import "server-only";

import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

let hasLoggedCurrentUserFailure = false;

export async function getCurrentSupabaseUser(): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    return user;
  } catch (error) {
    logCurrentUserFailure(error);

    return null;
  }
}

function logCurrentUserFailure(error: unknown) {
  if (hasLoggedCurrentUserFailure) {
    return;
  }

  hasLoggedCurrentUserFailure = true;

  console.warn("Supabase current user lookup failed.", {
    message: error instanceof Error ? error.message : "Unknown error."
  });
}
