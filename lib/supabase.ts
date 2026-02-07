import { createClient } from "@supabase/supabase-js";

// Hard-coded override to bypass Bolt environment cache
const SUPABASE_URL = "https://odhvxoelxiffhocrgtll.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kaHZ4b2VseGlmZmhvY3JndGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjczODgsImV4cCI6MjA3NjIwMzM4OH0.1Q0ES1vWPCZpTZQWzzLm_mWnWgX0uv_K0pLNvz7c3vw";

console.log("✅ Supabase configured:", SUPABASE_URL);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

// Admin client for webhooks (bypasses RLS)
export const supabaseAdmin = createClient(
  SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);