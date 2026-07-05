import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/lib/supabase/env";

export function createSupabaseServiceRoleClient() {
  const { url } = getSupabaseConfig();
  const secretKey = getSupabaseDefaultSecretKey();

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function getSupabaseDefaultSecretKey(): string {
  const secretKeys = process.env.SUPABASE_SECRET_KEYS;

  if (!secretKeys) {
    throw new Error("Missing SUPABASE_SECRET_KEYS.");
  }

  let parsedSecretKeys: unknown;

  try {
    parsedSecretKeys = JSON.parse(secretKeys);
  } catch {
    throw new Error(
      'Invalid SUPABASE_SECRET_KEYS. Expected JSON like {"default":"sb_secret_..."}'
    );
  }

  if (
    typeof parsedSecretKeys !== "object" ||
    parsedSecretKeys === null ||
    Array.isArray(parsedSecretKeys)
  ) {
    throw new Error(
      'Invalid SUPABASE_SECRET_KEYS. Expected JSON like {"default":"sb_secret_..."}'
    );
  }

  const defaultSecretKey = (parsedSecretKeys as Record<string, unknown>)
    .default;

  if (typeof defaultSecretKey !== "string" || defaultSecretKey.length === 0) {
    throw new Error('Missing "default" key in SUPABASE_SECRET_KEYS.');
  }

  return defaultSecretKey;
}
