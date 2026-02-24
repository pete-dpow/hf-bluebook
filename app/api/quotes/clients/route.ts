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

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  if (search.length < 2) {
    return NextResponse.json({ clients: [] });
  }

  // Get distinct clients from existing quotes
  const { data, error } = await supabaseAdmin
    .from("quotes")
    .select("client_name, client_email, client_phone")
    .eq("organization_id", auth.organizationId)
    .ilike("client_name", `%${search}%`)
    .order("client_name", { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deduplicate by client_name
  const seen = new Set<string>();
  const clients = (data || []).filter((c) => {
    const key = c.client_name?.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);

  return NextResponse.json({ clients });
}
