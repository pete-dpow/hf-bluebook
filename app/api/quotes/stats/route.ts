import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("quotes")
    .select("status, total, created_at")
    .eq("organization_id", auth.organizationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const quotes = data || [];
  const total = quotes.length;
  const draft = quotes.filter((q) => q.status === "draft").length;
  const sent = quotes.filter((q) => q.status === "sent").length;
  const approved = quotes.filter((q) => q.status === "approved").length;
  const total_value = quotes.reduce((sum, q) => sum + (parseFloat(q.total) || 0), 0);

  // 30-day trend calculations
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const recent = quotes.filter((q) => now - new Date(q.created_at).getTime() < thirtyDays);
  const previous = quotes.filter((q) => {
    const age = now - new Date(q.created_at).getTime();
    return age >= thirtyDays && age < thirtyDays * 2;
  });

  const total_trend = recent.length - previous.length;
  const approved_trend = recent.filter((q) => q.status === "approved").length -
    previous.filter((q) => q.status === "approved").length;
  const value_trend = recent.reduce((s, q) => s + (parseFloat(q.total) || 0), 0) -
    previous.reduce((s, q) => s + (parseFloat(q.total) || 0), 0);

  return NextResponse.json({ total, draft, sent, approved, total_value, total_trend, approved_trend, value_trend });
}
