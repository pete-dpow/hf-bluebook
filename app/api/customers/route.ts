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

  // Fetch all quotes (only needed columns) and aggregate in JS
  let query = supabaseAdmin
    .from("quotes")
    .select("client_name, client_email, client_phone, status, total, updated_at")
    .eq("organization_id", auth.organizationId);

  if (search) {
    query = query.ilike("client_name", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate by client_name (case-insensitive)
  const clientMap = new Map<string, {
    client_name: string;
    client_email: string | null;
    client_phone: string | null;
    quote_count: number;
    total_value: number;
    last_quote_date: string;
    statuses: string[];
  }>();

  for (const q of data || []) {
    const key = (q.client_name || "").toLowerCase();
    if (!key) continue;

    const existing = clientMap.get(key);
    if (existing) {
      existing.quote_count++;
      existing.total_value += parseFloat(q.total) || 0;
      if (q.updated_at > existing.last_quote_date) {
        existing.last_quote_date = q.updated_at;
      }
      if (q.client_email && !existing.client_email) existing.client_email = q.client_email;
      if (q.client_phone && !existing.client_phone) existing.client_phone = q.client_phone;
      if (q.status && !existing.statuses.includes(q.status)) existing.statuses.push(q.status);
    } else {
      clientMap.set(key, {
        client_name: q.client_name,
        client_email: q.client_email || null,
        client_phone: q.client_phone || null,
        quote_count: 1,
        total_value: parseFloat(q.total) || 0,
        last_quote_date: q.updated_at || "",
        statuses: q.status ? [q.status] : [],
      });
    }
  }

  // Sort by last activity descending
  const customers = Array.from(clientMap.values()).sort(
    (a, b) => (b.last_quote_date || "").localeCompare(a.last_quote_date || "")
  );

  return NextResponse.json({ customers });
}
