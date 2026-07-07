import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

export async function ensureProfile({
  userId,
  email
}: {
  userId: string;
  email: string;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email
    },
    {
      onConflict: "id"
    }
  );

  if (error) {
    throw new Error(`Could not ensure user profile: ${error.message}`);
  }
}
