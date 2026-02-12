import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const pillar = searchParams.get("pillar");
  const status = searchParams.get("status");
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("regulations")
    .select("*, regulation_sections(count)", { count: "exact" })
    .eq("organization_id", auth.organizationId)
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq("category", category);
  if (status) query = query.eq("status", status);
  if (pillar) query = query.contains("pillar_tags", [pillar]);
  if (search) query = query.or(`name.ilike.%${search}%,reference.ilike.%${search}%`);

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ regulations: data, total: count, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();

  if (!body.name || !body.reference || !body.category) {
    return NextResponse.json({ error: "name, reference, and category are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("regulations")
    .insert({
      organization_id: auth.organizationId,
      name: body.name,
      reference: body.reference,
      category: body.category,
      description: body.description || null,
      source_url: body.source_url || null,
      pillar_tags: body.pillar_tags || [],
      status: body.status || "in_force",
      effective_date: body.effective_date || null,
      scraper_config: body.scraper_config || {},
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ regulation: data }, { status: 201 });
}
