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
  const showArchived = searchParams.get("archived") === "true";

  let query = supabaseAdmin
    .from("manufacturers")
    .select("*, products(count), scrape_jobs(id, status, products_created, products_updated, error_log, completed_at, progress, duration_seconds, created_at)")
    .eq("organization_id", auth.organizationId)
    .order("name")
    .order("created_at", { referencedTable: "scrape_jobs", ascending: false })
    .limit(1, { referencedTable: "scrape_jobs" });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter archived in JS — avoids PostgREST .or() issues with referenced table joins
  const filtered = showArchived ? data : (data || []).filter((m: any) => m.is_archived !== true);
  return NextResponse.json({ manufacturers: filtered });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();

  const { data, error } = await supabaseAdmin.from("manufacturers").insert({
    organization_id: auth.organizationId,
    created_by: auth.user.id,
    name: body.name,
    website_url: body.website_url || null,
    contact_name: body.contact_name || null,
    contact_email: body.contact_email || null,
    contact_phone: body.contact_phone || null,
    trade_discount_percent: body.trade_discount_percent || null,
    scraper_config: body.scraper_config || {},
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ manufacturer: data }, { status: 201 });
}
