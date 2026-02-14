// lib/supabaseAdmin.ts — Shared Supabase admin client with runtime validation
//
// New API routes should import getSupabaseAdmin() from this file instead of
// creating their own client. This provides runtime validation that the
// service role key is actually configured (not still a build placeholder).

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder";

const client = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Returns the Supabase admin client. In production, throws if the service
 * role key is still the build placeholder (meaning env vars weren't configured).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (key === "build-placeholder" && process.env.NODE_ENV === "production") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. Set it in your environment variables."
    );
  }
  return client;
}
